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
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Public routes
router.get('/', listJobs);
router.get('/saved', authenticate, getSavedJobs);
router.get('/recommended', authenticate, getRecommendedJobs);
router.get('/:id', getJobDetail);
router.get('/:id/saved', checkJobSaved);
router.get('/:id/match-score', authenticate, getMatchScore);

// Protected routes
router.post('/:id/save', authenticate, saveJob);
router.delete('/:id/save', authenticate, unsaveJob);

export default router;