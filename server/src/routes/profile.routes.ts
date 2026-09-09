import { Router } from 'express';
import multer from 'multer';
import {
  getProfile,
  updateProfile,
  uploadProfilePhoto,
  uploadResume,
  analyzeProfileResume,
  getEligibleJobsCount,
  getProfileCompletion,
} from '../controllers/profile.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// All profile routes require authentication
router.use(authMiddleware);

router.get('/', getProfile);
router.get('/completion', getProfileCompletion);
router.get('/eligible-jobs', getEligibleJobsCount);

router.patch('/', updateProfile);

router.post('/photo', upload.single('photo'), uploadProfilePhoto);
router.post('/resume', upload.single('resume'), uploadResume);
router.post('/resume/analyze', analyzeProfileResume);

export default router;