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
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// All profile routes require authentication
router.use(authenticate);

router.get('/', getProfile);
router.get('/completion', getProfileCompletion);
router.get('/eligible-jobs', getEligibleJobsCount);

router.patch('/', updateProfile);

router.post('/photo', upload.single('photo'), uploadProfilePhoto);
router.post('/resume', upload.single('resume'), uploadResume);
router.post('/resume/analyze', analyzeProfileResume);

export default router;