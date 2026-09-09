import { Router } from 'express';
import {
  listJobs,
  getJobDetail,
  getMatchScore,
  saveJob,
  unsaveJob,
  checkJobSaved,
  getSavedJobs,
  getRecommendedJobs,
} from '../controllers/jobs.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Public routes
router.get('/', listJobs);
router.get('/saved', authMiddleware, getSavedJobs);
router.get('/recommended', authMiddleware, getRecommendedJobs);
router.get('/:id', getJobDetail);
router.get('/:id/saved', checkJobSaved);
router.get('/:id/match-score', authMiddleware, getMatchScore);

// Protected routes
router.post('/:id/save', authMiddleware, saveJob);
router.delete('/:id/save', authMiddleware, unsaveJob);

export default router;