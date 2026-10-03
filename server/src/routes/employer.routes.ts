import { Router } from 'express';
import {
  getEmployerStats,
  getEmployerJobs,
  getEmployerJobDetail,
  getEmployerApplications,
  getApplicationDetail,
  scheduleInterview,
} from '../controllers/employer.controller';
import {
  getCompanyProfile,
  getCompanyAnalytics,
  updateCompanyProfile,
  uploadLogo,
  deleteCompanyLogo,
  uploadVerificationDocument,
  submitCompanyVerification,
  requestVerification,
  getVerificationStatus,
} from '../controllers/company-profile.controller';
// ONE implementation of the status change is shared with
// PATCH /api/applications/:id/status — pipeline rules, student email,
// notification and the Socket.io event all live there.
import { updateApplicationStatus } from '../controllers/applications-enhanced.controller';
import { authenticate, requireRole, validate } from '../middleware/auth.middleware';
import { singleDocument, singleImage } from '../middleware/upload.middleware';
import { z } from 'zod';

const router = Router();

// All employer routes require authentication and the EMPLOYER role.
router.use(authenticate);
router.use(requireRole('EMPLOYER'));

// ── Company profile ─────────────────────────────────────────────────────────
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
router.get('/company/stats', getCompanyAnalytics);

// Logo + verification document (Cloudinary via Multer memory storage)
router.post('/company/logo', ...singleImage('logo'), uploadLogo);
router.delete('/company/logo', deleteCompanyLogo);
router.post('/company/verification-document', ...singleDocument('document'), uploadVerificationDocument);

// Verification
router.post('/company/verify', submitCompanyVerification);
router.post('/company/request-verification', requestVerification);
router.get('/company/verification-status', getVerificationStatus);
router.get('/verification-status', getVerificationStatus);

// ── Dashboard ───────────────────────────────────────────────────────────────
router.get('/dashboard/stats', getEmployerStats);

// ── Jobs ────────────────────────────────────────────────────────────────────
router.get('/jobs', getEmployerJobs);
// Employer-scoped job detail (403 for a job that belongs to another company).
router.get('/jobs/:id', getEmployerJobDetail);

// ── Applications ────────────────────────────────────────────────────────────
router.get('/applications', getEmployerApplications);
router.get('/applications/:id', getApplicationDetail);
router.patch('/applications/:id/status', updateApplicationStatus);
router.post('/applications/:id/schedule-interview', scheduleInterview);

export default router;

