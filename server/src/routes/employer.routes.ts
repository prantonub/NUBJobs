import { Router } from 'express';
import {
  getEmployerStats,
  getEmployerDashboard,
  getEmployerJobs,
  getEmployerJobDetail,
  getEmployerApplications,
  getApplicationDetail,
  getEmployerMessages,
  getEmployerMessageThread,
  sendEmployerMessage,
  scheduleInterview,
} from '../controllers/employer.controller';
import {
  getCompanyProfile,
  getCompanyAnalytics,
  updateCompanyProfile,
  uploadLogo,
  deleteCompanyLogo,
  uploadVerificationDocument,
  submitCompanyVerification,
  requestVerification,
  getVerificationStatus,
} from '../controllers/company-profile.controller';
// ONE implementation of the status change is shared with
// PATCH /api/applications/:id/status — pipeline rules, student email,
// notification and the Socket.io event all live there.
import { updateApplicationStatus } from '../controllers/applications-enhanced.controller';
import { authenticate, requireRole, validate, AuthRequest } from '../middleware/auth.middleware';
import { singleDocument, singleImage } from '../middleware/upload.middleware';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { responses, sendError, sendValidationError } from '../utils/response.utils';

const router = Router();

// All employer routes require authentication and the EMPLOYER role.
router.use(authenticate);
router.use(requireRole('EMPLOYER'));

// ── Company profile ─────────────────────────────────────────────────────────
const updateCompanySchema = z.object({
  companyName: z.string().min(3).max(100).optional(),
  about: z.string().max(2000).optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  linkedinUrl: z.string().url().optional().or(z.literal('')),
  twitterUrl: z.string().url().optional().or(z.literal('')),
  facebookUrl: z.string().url().optional().or(z.literal('')),
  location: z.string().optional().or(z.literal('')),
  foundedYear: z.coerce.number().int().min(1900).max(new Date().getFullYear()).optional(),
  employees: z.coerce.number().int().positive().optional(),
  industry: z.string().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
});

router.get('/company', getCompanyProfile);
router.patch('/company', validate(updateCompanySchema), updateCompanyProfile);
router.get('/company/stats', getCompanyAnalytics);

// Logo + verification document (Cloudinary via Multer memory storage)
router.post('/company/logo', ...singleImage('logo'), uploadLogo);
router.delete('/company/logo', deleteCompanyLogo);
router.post('/company/verification-document', ...singleDocument('document'), uploadVerificationDocument);

// Verification
router.post('/company/verify', submitCompanyVerification);
router.post('/company/request-verification', requestVerification);
router.get('/company/verification-status', getVerificationStatus);
router.get('/verification-status', getVerificationStatus);

// ── Dashboard ───────────────────────────────────────────────────────────────
router.get('/dashboard/stats', getEmployerStats);
// Spec endpoint: overview + recent jobs/applications + hiring metrics.
router.get('/dashboard', getEmployerDashboard);

// ── Kanban pipeline (grouped applications for the employer's OWN jobs) ──────
// Same handler as GET /applications (view=kanban): grouped by status with
// student skills/CGPA/match score, always filtered by `employerId`.
router.get('/pipeline', getEmployerApplications);

// ── Analytics (same payload as /company/stats: overview, charts, metrics) ──
router.get('/analytics', getCompanyAnalytics);

// ── Messaging (scoped to students who applied to this employer's jobs) ──────
const sendMessageToStudentSchema = z.object({
  message: z.string().min(1).max(5000),
});
router.get('/messages', getEmployerMessages);
router.get('/messages/:studentId', getEmployerMessageThread);
router.post('/messages/:studentId', validate(sendMessageToStudentSchema), sendEmployerMessage);

// ── Jobs ────────────────────────────────────────────────────────────────────
router.get('/jobs', getEmployerJobs);
// Employer-scoped job detail (403 for a job that belongs to another company).
router.get('/jobs/:id', getEmployerJobDetail);

// ── Applications ────────────────────────────────────────────────────────────
router.get('/applications', getEmployerApplications);
router.get('/applications/:id', getApplicationDetail);
router.patch('/applications/:id/status', updateApplicationStatus);
router.post('/applications/:id/schedule-interview', scheduleInterview);

// ── Search Talent (students who opted in to discovery) ────────────────────────
// Privacy: only `visibleToEmployers = true` profiles are searchable and the
// SELECT never includes email, phone, CV or date of birth. Auth + EMPLOYER
// role come from the router-level middleware above (401/403 otherwise).

/** GET query params arrive as strings; `skills` is checked again after split. */
const talentQuerySchema = z.object({
  program: z.string().trim().max(120).optional(),
  gradYear: z.string().regex(/^\d{4}$/, 'gradYear must be a 4-digit year').optional(),
  skills: z.string().trim().max(200).optional(),
  page: z.string().regex(/^\d+$/, 'page must be a positive integer').optional(),
  limit: z.string().regex(/^\d+$/, 'limit must be a positive integer').optional(),
});

// Per-user rate limit: 60 talent searches / 60s (spec §GET /employer/talent).
const talentSearchWindow = new Map<string, { count: number; resetAt: number }>();

function talentSearchLimited(userId: string, max = 60, windowMs = 60_000): number | null {
  const now = Date.now();
  const record = talentSearchWindow.get(userId);
  if (!record || now > record.resetAt) {
    talentSearchWindow.set(userId, { count: 1, resetAt: now + windowMs });
    return null;
  }
  if (record.count >= max) return Math.ceil((record.resetAt - now) / 1000);
  record.count += 1;
  return null;
}

router.get('/talent', async (req, res, next) => {
  try {
    const userId = (req as AuthRequest).userId;
    if (!userId) return responses.unauthorized(res, 'Unauthorized');

    const retryAfter = talentSearchLimited(userId);
    if (retryAfter !== null) {
      res.set('Retry-After', String(retryAfter));
      return sendError(res, 429, 'Too many talent searches — try again shortly');
    }

    const parsed = talentQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        errors[issue.path.join('.')] = issue.message;
      });
      return sendValidationError(res, errors);
    }
    const { program, gradYear, skills, page, limit } = parsed.data;

    // Comma separated: at most 5 values, each 1–30 chars.
    const skillList = (skills ?? '')
      .split(',')
      .map((skill) => skill.trim())
      .filter(Boolean);
    if (skillList.length > 5) {
      return responses.badRequest(res, 'Search by at most 5 skills');
    }
    if (skillList.some((skill) => skill.length > 30)) {
      return responses.badRequest(res, 'Each skill must be 1 to 30 characters');
    }

    const currentPage = Math.max(1, Number(page ?? 1));
    const pageSize = Math.min(20, Math.max(1, Number(limit ?? 12)));

    const where = {
      visibleToEmployers: true,
      user: { isBanned: false },
      ...(program ? { department: { equals: program, mode: 'insensitive' as const } } : {}),
      ...(gradYear ? { gradYear: Number(gradYear) } : {}),
      ...(skillList.length ? { skills: { hasSome: skillList } } : {}),
    };

    const [total, rows] = await Promise.all([
      prisma.studentProfile.count({ where }),
      prisma.studentProfile.findMany({
        where,
        // Privacy-safe projection ONLY — no email/phone/resume/DOB.
        select: {
          id: true,
          department: true,
          gradYear: true,
          skills: true,
          photoUrl: true,
          user: { select: { username: true, name: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (currentPage - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const students = rows.map((row) => ({
      id: row.id,
      username: row.user.username,
      fullName: row.user.name,
      program: row.department,
      gradYear: row.gradYear,
      skills: row.skills,
      photoUrl: row.photoUrl,
    }));

    return responses.ok(res, 'Talent search results', {
      students,
      total,
      page: currentPage,
      limit: pageSize,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

