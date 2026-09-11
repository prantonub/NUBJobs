import { Router } from 'express';
import multer from 'multer';
import {
  getCompanyProfile,
  updateCompanyProfile,
  uploadLogo,
  uploadVerificationDocument,
  requestVerification,
  getVerificationStatus,
} from '../controllers/company-profile.controller';
import { authenticate, requireRole, validate } from '../middleware/auth.middleware';
import { z } from 'zod';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Validation schemas
const updateProfileSchema = z.object({
  companyName: z.string().min(3).optional(),
  about: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  linkedinUrl: z.string().url().optional().or(z.literal('')),
  logoUrl: z.string().optional(),
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

// File uploads
router.post('/logo', upload.single('logo'), uploadLogo);
router.post('/verification-document', upload.single('document'), uploadVerificationDocument);

// Verification
router.post('/request-verification', validate(requestVerificationSchema), requestVerification);
router.get('/verification-status', getVerificationStatus);

export default router;