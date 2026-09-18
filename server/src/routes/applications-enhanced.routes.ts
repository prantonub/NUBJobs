import { Router } from 'express';
import { z } from 'zod';
import {
  createApplication,
  getMyApplications,
  getJobApplications,
  updateApplicationStatus,
  withdrawApplication,
  updateApplicationNotes,
  getApplicationDetail,
} from '../controllers/applications-enhanced.controller';
import { authenticate, requireRole, validate } from '../middleware/auth.middleware';

const router = Router();

// Validation schemas
// NOTE: Job/Application ids are Prisma `cuid()` values (e.g. "cmu11j0770002e6jcv675dgx4"),
// NOT UUIDs — validating with `z.string().uuid()` rejected every real job and
// made POST /api/applications impossible. Length bounds are the correct guard.
const createApplicationSchema = z.object({
  jobId: z.string().min(1).max(64),
  coverLetter: z.string().max(500).optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(['APPLIED', 'REVIEWED', 'SHORTLISTED', 'INTERVIEWED', 'HIRED', 'REJECTED', 'WITHDRAWN']),
  notes: z.string().optional(),
});

const updateNotesSchema = z.object({
  notes: z.string(),
});

// Student routes
router.post('/', authenticate, validate(createApplicationSchema), createApplication);
router.get('/my', authenticate, getMyApplications);
// Both verbs are accepted: the spec calls for POST /:id/withdraw, the current
// client hook (useWithdrawApplication) issues DELETE /:id.
router.post('/:id/withdraw', authenticate, withdrawApplication);
router.delete('/:id', authenticate, withdrawApplication);

// Application detail (student or employer)
router.get('/:id', authenticate, getApplicationDetail);

// Employer routes
router.get('/job/:jobId', authenticate, requireRole('EMPLOYER'), getJobApplications);
router.patch('/:id/status', authenticate, requireRole('EMPLOYER'), validate(updateStatusSchema), updateApplicationStatus);
router.patch('/:id/notes', authenticate, requireRole('EMPLOYER'), validate(updateNotesSchema), updateApplicationNotes);

export default router;