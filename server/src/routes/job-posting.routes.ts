import { Router } from 'express';
import {
  createJob,
  updateJob,
  publishJob,
  closeJob,
  previewJob,
  deleteJob,
  improveDescription,
} from '../controllers/job-posting.controller';
import { authenticate, requireRole, validate } from '../middleware/auth.middleware';
// Same schemas as POST/PATCH /api/jobs — one definition of what a valid job is.
import { createJobSchema, updateJobSchema } from '../utils/job-validation.utils';
import { z } from 'zod';

const router = Router();

const improveDescriptionSchema = z.object({
  description: z.string().min(20),
});

// All routes require authentication and EMPLOYER role
router.use(authenticate);
router.use(requireRole('EMPLOYER'));

// Job management
router.post('/', validate(createJobSchema), createJob);
router.patch('/:id', validate(updateJobSchema), updateJob);
router.post('/:id/publish', publishJob);
router.post('/:id/close', closeJob);
router.get('/:id/preview', previewJob);
router.delete('/:id', deleteJob);

// AI features
router.post('/improve-description', validate(improveDescriptionSchema), improveDescription);

export default router;