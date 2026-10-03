import { Router } from 'express';
import {
  listJobs,
  getJobCategories,
  getJobDetail,
  createJob,
  updateJob,
  updateJobStatus,
  deleteJob,
  getMyJobs,
  toggleSaveJob,
  getSavedJobs,
  getRecommendedJobs,
} from '../controllers/jobs-enhanced.controller';
import { authenticate, optionalAuth, requireRole, validate } from '../middleware/auth.middleware';
// Shared with POST/PATCH /api/employer/jobs so both endpoints accept exactly the
// same payload (including browser form values: numbers as strings, date-only deadlines).
import { createJobSchema, updateJobSchema } from '../utils/job-validation.utils';
import { z } from 'zod';

const router = Router();

const jobStatusActionSchema = z.object({
  action: z.enum(['close', 'feature', 'unfeature']),
});

// Public routes
// NOTE: specific paths must be registered before '/:id', otherwise Express
// matches '/:id' first and '/categories' / '/recommended' / '/saved' 404.
router.get('/', optionalAuth, listJobs);
router.get('/categories', getJobCategories);

// Student routes
router.get('/saved', authenticate, getSavedJobs);
router.get('/recommended', authenticate, getRecommendedJobs);
router.post('/:id/save', authenticate, toggleSaveJob);

// Single job (keep last so it cannot shadow the routes above)
router.get('/:id', optionalAuth, getJobDetail);

// Employer routes
router.post('/', authenticate, requireRole('EMPLOYER'), validate(createJobSchema), createJob);
// PUT kept for backwards compatibility, PATCH is the documented verb.
router.put('/:id', authenticate, requireRole('EMPLOYER'), validate(updateJobSchema), updateJob);
router.patch('/:id', authenticate, requireRole('EMPLOYER'), validate(updateJobSchema), updateJob);
router.patch(
  '/:id/status',
  authenticate,
  requireRole('EMPLOYER'),
  validate(jobStatusActionSchema),
  updateJobStatus
);
router.delete('/:id', authenticate, requireRole('EMPLOYER'), deleteJob);
router.get('/employer/my', authenticate, requireRole('EMPLOYER'), getMyJobs);

export default router;