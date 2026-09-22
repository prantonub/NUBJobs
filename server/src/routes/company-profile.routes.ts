import { Router } from 'express';
import {
  getCompanyProfile,
  updateCompanyProfile,
  uploadLogo,
  deleteCompanyLogo,
  uploadVerificationDocument,
  requestVerification,
  getVerificationStatus,
  getCompanyStats,
} from '../controllers/company-profile.controller';
import { authenticate, requireRole, validate } from '../middleware/auth.middleware';
import { singleDocument, singleImage } from '../middleware/upload.middleware';
import { z } from 'zod';

const router = Router();

// Validation schemas
const updateProfileSchema = z.object({
  companyName: z.string().min(3).max(100).optional(),
  about: z.string().max(2000).optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  linkedinUrl: z.string().url().optional().or(z.literal('')),
  twitterUrl: z.string().url().optional().or(z.literal('')),
  facebookUrl: z.string().url().optional().or(z.literal('')),
  logoUrl: z.string().optional(),
  location: z.string().optional().or(z.literal('')),
  foundedYear: z.coerce.number().int().min(1900).max(new Date().getFullYear()).optional(),
  employees: z.coerce.number().int().positive().optional(),
  industry: z.string().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
});

const requestVerificationSchema = z.object({
  documentType: z.enum(['TRADE_LICENSE', 'REGISTRATION', 'TAX_ID']),
  registrationNumber: z.string().min(5),
});

// All routes require authentication and EMPLOYER role
router.use(authenticate);
router.use(requireRole('EMPLOYER'));

// Profile management
router.get('/', getCompanyProfile);
router.patch('/', validate(updateProfileSchema), updateCompanyProfile);

// Stats / analytics
router.get('/stats', getCompanyStats);

// File uploads (Cloudinary via Multer memory storage)
router.post('/logo', ...singleImage('logo'), uploadLogo);
router.delete('/logo', deleteCompanyLogo);
router.post('/verification-document', ...singleDocument('document'), uploadVerificationDocument);

// Verification
router.post('/request-verification', validate(requestVerificationSchema), requestVerification);
router.get('/verification-status', getVerificationStatus);

export default router;