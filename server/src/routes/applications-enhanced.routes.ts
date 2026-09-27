import { Router } from 'express';
import { z } from 'zod';
import {
  createApplication,
  getMyApplications,
  getApplicationStats,
  getJobApplications,
  updateApplicationStatus,
  withdrawApplication,
  updateApplicationNotes,
  getApplicationDetail,
} from '../controllers/applications-enhanced.controller';
import { authenticate, requireRole, validate } from '../middleware/auth.middleware';

const router = Router();

// NOTE: job/application ids are Prisma `cuid()` values (e.g.
// "cmu11j0770002e6jcv675dgx4"), not UUIDs — validating with
// `z.string().uuid()` rejected every real job. Length bounds are the guard.
const createApplicationSchema = z.object({
  jobId: z.string().min(1).max(64),
  coverLetter: z.string().max(500).optional(),
});

const updateStatusSchema = z.object({
  status: z.enum([
    'APPLIED',
    'REVIEWED',
    'SHORTLISTED',
    'INTERVIEWED',
    'HIRED',
    'REJECTED',
    'WITHDRAWN',
  ]),
  notes: z.string().max(5000).optional(),
});

const updateNotesSchema = z.object({
  notes: z.string().max(5000),
});

// ── Student routes ──────────────────────────────────────────────────────────
router.post('/', authenticate, validate(createApplicationSchema), createApplication);

// Static paths must be registered before '/:id', otherwise Express matches the
// dynamic segment first and '/stats' / '/job/x' 404.
router.get('/', authenticate, getMyApplications);
router.get('/my', authenticate, getMyApplications);
router.get('/stats', authenticate, getApplicationStats);

router.post('/:id/withdraw', authenticate, withdrawApplication);
// The client hook historically used DELETE /:id for withdrawal.
router.delete('/:id', authenticate, withdrawApplication);

// ── Employer routes ─────────────────────────────────────────────────────────
router.get('/job/:jobId', authenticate, requireRole('EMPLOYER'), getJobApplications);
router.patch(
  '/:id/status',
  authenticate,
  requireRole('EMPLOYER'),
  validate(updateStatusSchema),
  updateApplicationStatus
);
router.patch(
  '/:id/notes',
  authenticate,
  requireRole('EMPLOYER'),
  validate(updateNotesSchema),
  updateApplicationNotes
);

// ── Shared detail (student who applied OR employer who owns the job) ────────
router.get('/:id', authenticate, getApplicationDetail);

export default router;

