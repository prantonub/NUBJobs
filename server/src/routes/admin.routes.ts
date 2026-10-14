import { Router } from 'express';
import { z } from 'zod';
import {
  getAdminStats,
  getAdminAnalytics,
  getAdminDatabaseOverview,
  listUsers,
  updateUserRole,
  toggleUserBan,
  deleteUser,
  listJobs,
  createAdminJob,
  deleteAdminJob,
  updateJobStatus,
  toggleJobFeature,
  listEmployers,
  createAdminCompany,
  deleteAdminCompany,
  updateEmployerVerification,
  listProfileVerifications,
  approveProfileVerification,
  rejectProfileVerification,
  rejectEmployerVerification,
} from '../controllers/admin.controller';
import {
  getAdminDashboard,
  listAllUsers,
  getUserDetail,
  updateUserStatus,
  resetUserPassword,
  listAllJobs,
  getAdminJobDetail,
  approveJob,
  rejectJob,
  featureJob,
  requestJobChanges,
  listAllCompanies,
  listVerificationRequests,
  verifyCompany,
  rejectCompanyVerification,
  revokeCompanyVerification,
  listAllApplications,
  getAdminApplicationDetail,
  getAdminPipeline,
  updateAdminApplicationStatus,
  listDisputes,
  getDisputeDetail,
  resolveDispute,
  getAdminDetailedAnalytics,
  listAuditLogs,
  getUserActivityLogs,
  sendAdminMessage,
  getAdminMessagesOverview,
  listAdmins,
  createAdminAccount,
  getPlatformSettings,
  updatePlatformSettings,
} from './admin-spec.routes';
import { authenticate, requireRole, validate } from '../middleware/auth.middleware';
import { requirePermission } from '../controllers/admin-spec.helpers';

const router = Router();

const roleSchema = z.object({
  role: z.enum(['STUDENT', 'EMPLOYER', 'ADMIN', 'MODERATOR']),
});

const toggleBanSchema = z.object({
  isBanned: z.boolean().optional(),
});

const jobDecisionSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']).optional(),
  reason: z.string().optional(),
});

const verifyEmployerSchema = z.object({
  approved: z.boolean(),
  note: z.string().optional(),
});

const createAdminJobSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(20),
  employerId: z.string().optional(),
  category: z.string().optional(),
  type: z.enum(['FULL_TIME', 'PART_TIME', 'INTERNSHIP', 'REMOTE', 'HYBRID', 'CONTRACT']).optional(),
  location: z.string().optional(),
  salaryMin: z.number().optional(),
  salaryMax: z.number().optional(),
  minCgpa: z.number().optional(),
  skills: z.array(z.string()).optional(),
  deadline: z.string().optional(),
  targetUniversity: z.enum(['NUB', 'ALL']).optional(),
  status: z.enum(['DRAFT', 'PENDING', 'ACTIVE', 'APPROVED']).optional(),
});

const createAdminCompanySchema = z.object({
  companyName: z.string().min(2),
  about: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  linkedinUrl: z.string().url().optional().or(z.literal('')),
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(8).optional(),
});

router.get('/stats', getAdminStats);
router.get('/analytics', getAdminAnalytics);
router.get('/database', getAdminDatabaseOverview);

router.use(authenticate);
router.use(requireRole('ADMIN'));

// â”€â”€ Spec dashboard (#1) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/dashboard', getAdminDashboard);

// â”€â”€ Spec users (#2â€“#5) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/users/all', listAllUsers);
router.get('/users/:id/detail', getUserDetail);
router.patch(
  '/users/:id/status',
  requirePermission('ban_user'),
  validate(z.object({ status: z.enum(['ACTIVE', 'INACTIVE', 'BANNED']), reason: z.string().optional() })),
  updateUserStatus
);
router.post('/users/:id/reset-password', requirePermission('reset_password'), resetUserPassword);

// â”€â”€ Spec jobs (#7â€“#12) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/jobs/all', listAllJobs);
router.get('/jobs/:id/detail', getAdminJobDetail);
router.patch('/jobs/:id/approve', requirePermission('approve_job'), validate(z.object({ notes: z.string().optional() })), approveJob);
router.patch('/jobs/:id/reject', requirePermission('reject_job'), validate(z.object({ reason: z.string().min(3) })), rejectJob);
router.patch('/jobs/:id/feature', requirePermission('feature_job'), validate(z.object({ featured: z.boolean().optional() })), featureJob);
router.patch('/jobs/:id/request-changes', requirePermission('reject_job'), validate(z.object({ reason: z.string().min(3) })), requestJobChanges);
router.delete('/jobs/:id/remove', requirePermission('delete_job'), validate(z.object({ reason: z.string().min(3) })), deleteAdminJob);

// â”€â”€ Spec companies (#13â€“#16) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/companies', listAllCompanies);
router.get('/companies/verification-requests', listVerificationRequests);

// Profile verification queue — students + employers (blue verified badge).
// approve/reject reuse the company-verify permission tiers (SUPER_ADMIN +
// CONTENT_MODERATOR); the Support tier can only view the queue.
router.get('/verifications', requirePermission('view'), listProfileVerifications);
router.patch('/verifications/:kind/:id/approve', requirePermission('verify_company'), approveProfileVerification);
router.patch(
  '/verifications/:kind/:id/reject',
  requirePermission('reject_company'),
  validate(z.object({ reason: z.string().min(3) })),
  rejectProfileVerification
);
router.patch('/companies/:id/verify', requirePermission('verify_company'), validate(z.object({ notes: z.string().optional() })), verifyCompany);
router.patch('/companies/:id/reject-verification', requirePermission('reject_company'), validate(z.object({ reason: z.string().min(3) })), rejectCompanyVerification);
router.patch('/companies/:id/revoke', requirePermission('verify_company'), validate(z.object({ reason: z.string().optional() })), revokeCompanyVerification);

// â”€â”€ Spec applications (#17â€“#18) + pipeline â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/applications', listAllApplications);
router.get('/applications/:id', getAdminApplicationDetail);
router.patch(
  '/applications/:id/status',
  requirePermission('resolve_dispute'),
  validate(z.object({ status: z.string().min(3), notes: z.string().optional() })),
  updateAdminApplicationStatus
);
router.get('/pipeline', getAdminPipeline);

// â”€â”€ Spec disputes (#19â€“#21) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/disputes', listDisputes);
router.get('/disputes/:id', getDisputeDetail);
router.patch(
  '/disputes/:id/resolve',
  requirePermission('resolve_dispute'),
  validate(z.object({ resolution: z.string().min(3), action: z.string().optional(), targetUser: z.string().optional() })),
  resolveDispute
);

// â”€â”€ Spec analytics (#22), audit (#23â€“#24), settings, messaging (#25) â”€â”€â”€â”€â”€â”€
router.get('/analytics/detailed', getAdminDetailedAnalytics);
router.get('/audit-logs', requirePermission('*'), listAuditLogs);
router.get('/activity-logs/:userId', getUserActivityLogs);
router.get('/settings', requirePermission('*'), getPlatformSettings);
router.patch('/settings', requirePermission('*'), updatePlatformSettings);
router.get('/admins', requirePermission('*'), listAdmins);
router.post(
  '/admins',
  requirePermission('*'),
  validate(z.object({
    email: z.string().email(),
    name: z.string().min(2),
    password: z.string().min(8).optional(),
    adminRole: z.enum(['SUPER_ADMIN', 'CONTENT_MODERATOR', 'SUPPORT_TEAM']).optional(),
  })),
  createAdminAccount
);
router.post(
  '/message/:userId',
  requirePermission('message_user'),
  validate(z.object({ message: z.string().min(1), reason: z.string().optional() })),
  sendAdminMessage
);
router.get('/messages/overview', getAdminMessagesOverview);

router.get('/users', listUsers);
router.patch('/users/:id/role', validate(roleSchema), updateUserRole);
router.patch('/users/:id/ban', validate(toggleBanSchema), toggleUserBan);
router.delete('/users/:id', deleteUser);

router.get('/jobs', listJobs);
router.post('/jobs', validate(createAdminJobSchema), createAdminJob);
router.delete('/jobs/:id', deleteAdminJob);
router.patch('/jobs/:id/status', validate(jobDecisionSchema), updateJobStatus);
router.patch('/jobs/:id/feature', toggleJobFeature);

router.get('/employers', listEmployers);
router.post('/companies', validate(createAdminCompanySchema), createAdminCompany);
router.delete('/companies/:id', deleteAdminCompany);
router.patch('/employers/:id/verify', validate(verifyEmployerSchema), updateEmployerVerification);
router.patch(
  '/employers/:id/reject',
  validate(z.object({ reason: z.string().optional() })),
  rejectEmployerVerification
);

export default router;
