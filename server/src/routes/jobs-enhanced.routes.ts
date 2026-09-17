import { Router } from 'express';
import { z } from 'zod';
import {
  listJobs,
  getJobCategories,
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
const jobTypeEnum = z.enum([
  'FULL_TIME',
  'PART_TIME',
  'INTERNSHIP',
  'CONTRACT',
  'REMOTE',
  'HYBRID',
]);

const createJobSchema = z.object({
  title: z.string().min(5).max(100),
  description: z.string().min(50),
  category: z.string().optional(),
  type: jobTypeEnum,
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
  type: jobTypeEnum.optional(),
  location: z.string().optional(),
  salaryMin: z.number().optional(),
  salaryMax: z.number().optional(),
  minCgpa: z.number().optional(),
  skills: z.array(z.string()).optional(),
  deadline: z.string().datetime().optional(),
  targetUniversity: z.enum(['ALL', 'NUB', 'OTHER']).optional(),
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
router.put('/:id', authenticate, requireRole('EMPLOYER'), validate(updateJobSchema), updateJob);
router.delete('/:id', authenticate, requireRole('EMPLOYER'), deleteJob);
router.get('/employer/my', authenticate, requireRole('EMPLOYER'), getMyJobs);

export default router;