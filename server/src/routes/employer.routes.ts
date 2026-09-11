import { Router } from 'express';
import {
  getEmployerStats,
  getEmployerJobs,
  getEmployerApplications,
  getApplicationDetail,
  updateApplicationStatus,
  scheduleInterview,
} from '../controllers/employer.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

// All employer routes require authentication and EMPLOYER role
router.use(authenticate);
router.use(requireRole('EMPLOYER'));

// Dashboard
router.get('/dashboard/stats', getEmployerStats);

// Jobs
router.get('/jobs', getEmployerJobs);

// Applications
router.get('/applications', getEmployerApplications);
router.get('/applications/:id', getApplicationDetail);
router.patch('/applications/:id/status', updateApplicationStatus);
router.post('/applications/:id/schedule-interview', scheduleInterview);

export default router;