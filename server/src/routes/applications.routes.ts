import { Router } from 'express';
import {
  getApplications,
  getApplicationDetail,
  createApplication,
  updateApplication,
  withdrawApplication,
  getApplicationMatchScore,
  getApplicationStats,
} from '../controllers/applications.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// All application routes require authentication
router.use(authMiddleware);

router.get('/', getApplications);
router.get('/stats', getApplicationStats);
router.get('/:id', getApplicationDetail);
router.get('/:id/match-score', getApplicationMatchScore);

router.post('/', createApplication);
router.patch('/:id', updateApplication);
router.post('/:id/withdraw', withdrawApplication);

export default router;