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
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All application routes require authentication
router.use(authenticate);

router.get('/', getApplications);
router.get('/stats', getApplicationStats);
router.get('/:id', getApplicationDetail);
router.get('/:id/match-score', getApplicationMatchScore);

router.post('/', createApplication);
router.patch('/:id', updateApplication);
router.post('/:id/withdraw', withdrawApplication);

export default router;