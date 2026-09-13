import { Router } from 'express';
import { z } from 'zod';
import {
  listJobs,
  getJobDetail,
  createJob,
  updateJob,
  deleteJob,
  getMyJobs,
  toggleSaveJob,
  getSavedJobs,
  getRecommendedJobs,
} from '../controllers/jobs-enhanced.controller';
import { authenticate, optionalAuth, requireRole, validate } from '../middleware/auth.middleware';

const router = Router();

// Validation schemas
const createJobSchema = z.object({
  title: z.string().min(5).max(100),
  description: z.string().min(50),
  category: z.string().optional(),
  type: z.enum(['FULL_TIME', 'PART_TIME', 'INTERNSHIP', 'CONTRACT']),
  location: z.string().optional(),
  salaryMin: z.number().optional(),
  salaryMax: z.number().optional(),
  minCgpa: z.number().optional(),
  skills: z.array(z.string()).min(1),
  deadline: z.string().datetime().optional(),
  targetUniversity: z.enum(['ALL', 'NUB', 'OTHER']).optional(),
});

const updateJobSchema = z.object({
  title: z.string().min(5).max(100).optional(),
  description: z.string().min(50).optional(),
  category: z.string().optional(),
  type: z.enum(['FULL_TIME', 'PART_TIME', 'INTERNSHIP', 'CONTRACT']).optional(),
  location: z.string().optional(),
  salaryMin: z.number().optional(),
  salaryMax: z.number().optional(),
  minCgpa: z.number().optional(),
  skills: z.array(z.string()).optional(),
  deadline: z.string().datetime().optional(),
  targetUniversity: z.enum(['ALL', 'NUB', 'OTHER']).optional(),
});

// Public routes
router.get('/', optionalAuth, listJobs);
router.get('/:id', optionalAuth, getJobDetail);
router.get('/recommended', authenticate, getRecommendedJobs);

// Student routes
router.post('/:id/save', authenticate, toggleSaveJob);
router.get('/saved', authenticate, getSavedJobs);

// Employer routes
router.post('/', authenticate, requireRole('EMPLOYER'), validate(createJobSchema), createJob);
router.put('/:id', authenticate, requireRole('EMPLOYER'), validate(updateJobSchema), updateJob);
router.delete('/:id', authenticate, requireRole('EMPLOYER'), deleteJob);
router.get('/employer/my', authenticate, requireRole('EMPLOYER'), getMyJobs);

export default router;