import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  uploadProfilePhoto,
  uploadResume,
  deleteProfilePhoto,
  deleteProfileResume,
  analyzeProfileResume,
  getEligibleJobsCount,
  getProfileCompletion,
} from '../controllers/profile.controller';
import { authenticate } from '../middleware/auth.middleware';
import { singleDocument, singleImage } from '../middleware/upload.middleware';

const router = Router();

// NOTE: authentication is applied per route (not with router.use) so that this
// router can be mounted before the public profile router — unmatched requests
// fall through to `/api/profile/:userId` instead of being rejected with a 401.
router.get('/', authenticate, getProfile);
router.get('/completion', authenticate, getProfileCompletion);
router.get('/eligible-jobs', authenticate, getEligibleJobsCount);

router.patch('/', authenticate, updateProfile);

// Uploads: authenticate before Multer so unauthenticated requests are rejected
// without buffering the file in memory.
router.post('/photo', authenticate, ...singleImage('photo'), uploadProfilePhoto);
router.delete('/photo', authenticate, deleteProfilePhoto);
router.post('/resume', authenticate, ...singleDocument('resume'), uploadResume);
router.delete('/resume', authenticate, deleteProfileResume);
router.post('/resume/analyze', authenticate, analyzeProfileResume);

export default router;