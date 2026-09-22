import { Router } from 'express';
import {
  getEmployerStats,
  getEmployerJobs,
  getEmployerApplications,
  getApplicationDetail,
  updateApplicationStatus,
  scheduleInterview,
} from '../controllers/employer.controller';
import {
  getCompanyProfile,
  updateCompanyProfile,
  uploadLogo,
  deleteCompanyLogo,
} from '../controllers/company-profile.controller';
import { authenticate, requireRole, validate } from '../middleware/auth.middleware';
import { singleImage } from '../middleware/upload.middleware';
import { z } from 'zod';

const router = Router();

// All employer routes require authentication and EMPLOYER role
router.use(authenticate);
router.use(requireRole('EMPLOYER'));

// Company profile (spec paths; same handlers as /api/company)
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

// Company logo upload/delete (spec path used by the employer UI)
router.post('/company/logo', ...singleImage('logo'), uploadLogo);
router.delete('/company/logo', deleteCompanyLogo);

// Dashboard
router.get('/dashboard/stats', getEmployerStats);

// Jobs
router.get('/jobs', getEmployerJobs);

// Applications
router.get('/applications', getEmployerApplications);
router.get('/applications/:id', getApplicationDetail);
router.patch('/applications/:id/status', updateApplicationStatus);
router.post('/applications/:id/schedule-interview', scheduleInterview);

export default router;