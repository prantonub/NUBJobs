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
import { z } from 'zod';

const router = Router();

// Validation schemas
const createJobSchema = z.object({
  title: z.string().min(5),
  description: z.string().min(20),
  category: z.string().optional(),
  type: z.enum(['FULL_TIME', 'PART_TIME', 'INTERNSHIP', 'REMOTE', 'HYBRID']),
  location: z.string().optional(),
  salaryMin: z.number().optional(),
  salaryMax: z.number().optional(),
  minCgpa: z.number().optional(),
  skills: z.array(z.string()).min(1),
  deadline: z.string().optional(),
  targetUniversity: z.enum(['NUB', 'ALL']).optional(),
});

const updateJobSchema = z.object({
  title: z.string().min(5).optional(),
  description: z.string().min(20).optional(),
  category: z.string().optional(),
  type: z.enum(['FULL_TIME', 'PART_TIME', 'INTERNSHIP', 'REMOTE', 'HYBRID']).optional(),
  location: z.string().optional(),
  salaryMin: z.number().optional(),
  salaryMax: z.number().optional(),
  minCgpa: z.number().optional(),
  skills: z.array(z.string()).optional(),
  deadline: z.string().optional(),
  targetUniversity: z.enum(['NUB', 'ALL']).optional(),
});

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