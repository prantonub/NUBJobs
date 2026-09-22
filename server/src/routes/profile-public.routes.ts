import { Router } from 'express';
import { z } from 'zod';
import {
  getPublicProfile,
  updateStudentProfile,
  uploadResume,
  uploadPhoto,
  deleteResume,
  deletePhoto,
  getPublicStudentProfile,
} from '../controllers/profile-public.controller';
import { authenticate, optionalAuth, validate } from '../middleware/auth.middleware';
import { singleDocument, singleImage } from '../middleware/upload.middleware';

const router = Router();

// Validation schemas
const updateProfileSchema = z.object({
  phone: z.string().optional(),
  location: z.string().optional(),
  bio: z.string().max(500).optional(),
  skills: z.array(z.string()).optional(),
  linkedinUrl: z.string().url().optional(),
  githubUrl: z.string().url().optional(),
  portfolioUrl: z.string().url().optional(),
  nubId: z.string().optional(),
  cgpa: z.number().min(0).max(4.0).optional(),
  department: z.string().optional(),
});

// Public routes
router.get('/:userId', optionalAuth, getPublicProfile);
router.get('/:userId/public', optionalAuth, getPublicStudentProfile);

// Student routes (protected)
router.put('/', authenticate, validate(updateProfileSchema), updateStudentProfile);
router.post(
  '/upload-resume',
  authenticate,
  ...singleDocument('resume'),
  uploadResume
);
router.post(
  '/upload-photo',
  authenticate,
  ...singleImage('photo'),
  uploadPhoto
);
router.delete('/resume', authenticate, deleteResume);
router.delete('/photo', authenticate, deletePhoto);

export default router;