import { Router } from 'express';
import { z } from 'zod';
import {
  getAdminStats,
  getAdminAnalytics,
  getAdminDatabaseOverview,
  listUsers,
  updateUserRole,
  toggleUserBan,
  deleteUser,
  listJobs,
  createAdminJob,
  deleteAdminJob,
  updateJobStatus,
  toggleJobFeature,
  listEmployers,
  createAdminCompany,
  deleteAdminCompany,
  updateEmployerVerification,
} from '../controllers/admin.controller';
import { authenticate, requireRole, validate } from '../middleware/auth.middleware';

const router = Router();

const roleSchema = z.object({
  role: z.enum(['STUDENT', 'EMPLOYER', 'ADMIN', 'MODERATOR']),
});

const toggleBanSchema = z.object({
  isBanned: z.boolean().optional(),
});

const jobDecisionSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']).optional(),
  reason: z.string().optional(),
});

const verifyEmployerSchema = z.object({
  approved: z.boolean(),
  note: z.string().optional(),
});

const createAdminJobSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(20),
  employerId: z.string().optional(),
  category: z.string().optional(),
  type: z.enum(['FULL_TIME', 'PART_TIME', 'INTERNSHIP', 'REMOTE', 'HYBRID', 'CONTRACT']).optional(),
  location: z.string().optional(),
  salaryMin: z.number().optional(),
  salaryMax: z.number().optional(),
  minCgpa: z.number().optional(),
  skills: z.array(z.string()).optional(),
  deadline: z.string().optional(),
  targetUniversity: z.enum(['NUB', 'ALL']).optional(),
  status: z.enum(['DRAFT', 'PENDING', 'ACTIVE']).optional(),
});

const createAdminCompanySchema = z.object({
  companyName: z.string().min(2),
  about: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  linkedinUrl: z.string().url().optional().or(z.literal('')),
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(8).optional(),
});

router.get('/stats', getAdminStats);
router.get('/analytics', getAdminAnalytics);
router.get('/database', getAdminDatabaseOverview);

router.use(authenticate);
router.use(requireRole('ADMIN'));

router.get('/users', listUsers);
router.patch('/users/:id/role', validate(roleSchema), updateUserRole);
router.patch('/users/:id/ban', validate(toggleBanSchema), toggleUserBan);
router.delete('/users/:id', deleteUser);

router.get('/jobs', listJobs);
router.post('/jobs', validate(createAdminJobSchema), createAdminJob);
router.delete('/jobs/:id', deleteAdminJob);
router.patch('/jobs/:id/status', validate(jobDecisionSchema), updateJobStatus);
router.patch('/jobs/:id/feature', toggleJobFeature);

router.get('/employers', listEmployers);
router.post('/companies', validate(createAdminCompanySchema), createAdminCompany);
router.delete('/companies/:id', deleteAdminCompany);
router.patch('/employers/:id/verify', validate(verifyEmployerSchema), updateEmployerVerification);

export default router;
