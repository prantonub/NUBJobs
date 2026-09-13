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
const createApplicationSchema = z.object({
  jobId: z.string().uuid(),
  coverLetter: z.string().optional(),
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
router.delete('/:id', authenticate, withdrawApplication);

// Application detail (student or employer)
router.get('/:id', authenticate, getApplicationDetail);

// Employer routes
router.get('/job/:jobId', authenticate, requireRole('EMPLOYER'), getJobApplications);
router.patch('/:id/status', authenticate, requireRole('EMPLOYER'), validate(updateStatusSchema), updateApplicationStatus);
router.patch('/:id/notes', authenticate, requireRole('EMPLOYER'), validate(updateNotesSchema), updateApplicationNotes);

export default router;