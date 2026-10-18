import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import multer, { MulterError } from 'multer';
import prisma from '../lib/prisma';
import {
  authenticate,
  requireRole,
  validate,
  rateLimit,
  AuthRequest,
} from '../middleware/auth.middleware';
import { responses, sendError } from '../utils/response.utils';
import { parseCv, analyzeCv, matchJob } from '../services/cvAnalyzer.service';

const router = Router();

const MAX_CV_BYTES = 5 * 1024 * 1024;
const CV_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
];

/** In-memory upload, 5 MB, PDF/DOCX only. File is parsed then dropped — never stored. */
const cvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_CV_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (CV_MIME_TYPES.includes(file.mimetype)) return cb(null, true);
    return cb(new Error('Only PDF and DOCX files are supported.'));
  },
});

/** Per-user upload throttle: 10 checks per hour (JWT identity, not just IP). */
const cvCheckWindows = new Map<string, { count: number; resetTime: number }>();
function cvCheckThrottle(req: AuthRequest, res: Response, next: NextFunction) {
  const key = req.userId ?? req.ip ?? 'unknown';
  const now = Date.now();
  const record = cvCheckWindows.get(key);
  if (!record || now > record.resetTime) {
    cvCheckWindows.set(key, { count: 1, resetTime: now + 60 * 60 * 1000 });
    return next();
  }
  if (record.count < 10) {
    record.count += 1;
    return next();
  }
  const resetIn = Math.ceil((record.resetTime - now) / 1000);
  res.set('Retry-After', String(resetIn));
  return sendError(res, 429, 'Too many requests', 'CV check limit reached (10 per hour).');
}

/** POST /api/cv/match — keyword match a saved check against a job. */
async function matchCv(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const body = req.body as z.infer<typeof matchSchema>;
    const row = await prisma.cvCheck.findUnique({ where: { id: body.checkId } });
    if (!row) return responses.notFound(res, 'Check not found.');
    if (row.userId !== req.userId) {
      return responses.forbidden(res, 'This check belongs to another student.');
    }

    let jobText = (body.jobText ?? '').trim();
    let jobId: string | null = null;
    if (body.jobId) {
      const job = await prisma.job.findUnique({
        where: { id: body.jobId },
        select: { id: true, status: true, title: true, description: true },
      });
      if (!job || job.status !== 'ACTIVE') {
        return responses.notFound(res, 'Job not found or no longer active.');
      }
      jobId = job.id;
      jobText = `${job.title}\n${job.description}`.trim();
    }
    if (!jobText) return responses.badRequest(res, 'Provide either jobId or jobText.');

    const { matchScore, matched, missing } = matchJob(row.extractedText, jobText);
    await prisma.cvCheck.update({
      where: { id: row.id },
      data: { jobId, matchScore },
    });
    return responses.ok(res, 'CV matched with job', { matchScore, matched, missing });
  } catch (error) {
    return next(error);
  }
}

/** GET /api/cv/history — newest first, without the extracted text. */
async function listHistory(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const rows = await prisma.cvCheck.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fileName: true,
        score: true,
        jobId: true,
        matchScore: true,
        createdAt: true,
      },
      take: 50,
    });
    return responses.ok(res, 'CV check history', { checks: rows });
  } catch (error) {
    return next(error);
  }
}

/** GET /api/cv/:checkId — full row for the owner. */
async function getCheck(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.checkId ?? '');
    const row = await prisma.cvCheck.findUnique({ where: { id } });
    if (!row) return responses.notFound(res, 'Check not found.');
    if (row.userId !== req.userId) {
      return responses.forbidden(res, 'This check belongs to another student.');
    }
    return responses.ok(res, 'CV check', row);
  } catch (error) {
    return next(error);
  }
}

/** DELETE /api/cv/:checkId — owner only. */
async function deleteCheck(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.checkId ?? '');
    const row = await prisma.cvCheck.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });
    if (!row) return responses.notFound(res, 'Check not found.');
    if (row.userId !== req.userId) {
      return responses.forbidden(res, 'This check belongs to another student.');
    }
    await prisma.cvCheck.delete({ where: { id } });
    return responses.ok(res, 'Check deleted');
  } catch (error) {
    return next(error);
  }
}

router.post(
  '/check',
  authenticate,
  requireRole('STUDENT'),
  rateLimit(10, 60 * 60 * 1000),
  cvCheckThrottle,
  cvUpload.single('cv'),
  multerErrors,
  (req: AuthRequest, res: Response, next: NextFunction) => {
    checkCv(req, res, next).catch(next);
  }
);
router.post(
  '/match',
  authenticate,
  requireRole('STUDENT'),
  validate(matchSchema),
  (req: AuthRequest, res: Response, next: NextFunction) => {
    matchCv(req, res, next).catch(next);
  }
);
router.get(
  '/history',
  authenticate,
  requireRole('STUDENT'),
  (req: AuthRequest, res: Response, next: NextFunction) => {
    listHistory(req, res, next).catch(next);
  }
);
router.get(
  '/:checkId',
  authenticate,
  requireRole('STUDENT'),
  (req: AuthRequest, res: Response, next: NextFunction) => {
    getCheck(req, res, next).catch(next);
  }
);
router.delete(
  '/:checkId',
  authenticate,
  requireRole('STUDENT'),
  (req: AuthRequest, res: Response, next: NextFunction) => {
    deleteCheck(req, res, next).catch(next);
  }
);

export default router;
