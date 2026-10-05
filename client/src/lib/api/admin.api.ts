import api from '@/lib/axios';

export const adminApi = {
  stats: () => api.get('/admin/stats'),
  analytics: () => api.get('/admin/analytics'),
  database: () => api.get('/admin/database'),
  // Spec dashboard (#1)
  dashboard: () => api.get('/admin/dashboard'),
  // Legacy user management
  users: (params?: Record<string, string | number | undefined>) => api.get('/admin/users', { params }),
  updateUserRole: (id: string, role: string) => api.patch(`/admin/users/${id}/role`, { role }),
  toggleUserBan: (id: string, isBanned: boolean) => api.patch(`/admin/users/${id}/ban`, { isBanned }),
  removeUser: (id: string) => api.delete(`/admin/users/${id}`),
  // Spec users (#2–#6)
  allUsers: (params?: Record<string, string | number | undefined>) => api.get('/admin/users/all', { params }),
  userDetail: (id: string) => api.get(`/admin/users/${id}/detail`),
  updateUserStatus: (id: string, status: 'ACTIVE' | 'INACTIVE' | 'BANNED', reason?: string) =>
    api.patch(`/admin/users/${id}/status`, { status, reason }),
  resetUserPassword: (id: string) => api.post(`/admin/users/${id}/reset-password`),
  // Legacy jobs
  jobs: () => api.get('/admin/jobs'),
  createJob: (payload: Record<string, unknown>) => api.post('/admin/jobs', payload),
  deleteJob: (id: string) => api.delete(`/admin/jobs/${id}`),
  updateJobStatus: (id: string, status: 'APPROVED' | 'REJECTED', reason?: string) =>
    api.patch(`/admin/jobs/${id}/status`, { status, reason }),
  toggleJobFeature: (id: string) => api.patch(`/admin/jobs/${id}/feature`),
  // Spec jobs (#7–#12)
  allJobs: (params?: Record<string, string | number | undefined>) => api.get('/admin/jobs/all', { params }),
  jobDetail: (id: string) => api.get(`/admin/jobs/${id}/detail`),
  approveJob: (id: string, notes?: string) => api.patch(`/admin/jobs/${id}/approve`, { notes }),
  rejectJob: (id: string, reason: string) => api.patch(`/admin/jobs/${id}/reject`, { reason }),
  featureJob: (id: string, featured?: boolean) => api.patch(`/admin/jobs/${id}/feature`, { featured }),
  requestJobChanges: (id: string, reason: string) => api.patch(`/admin/jobs/${id}/request-changes`, { reason }),
  removeJob: (id: string, reason: string) => api.delete(`/admin/jobs/${id}/remove`, { data: { reason } }),
  // Legacy employers
  employers: () => api.get('/admin/employers'),
  createCompany: (payload: Record<string, unknown>) => api.post('/admin/companies', payload),
  deleteCompany: (id: string) => api.delete(`/admin/companies/${id}`),
  updateEmployerVerification: (id: string, approved: boolean, note?: string) =>
    api.patch(`/admin/employers/${id}/verify`, { approved, note }),
  // Spec companies (#13–#16)
  companies: (params?: Record<string, string | number | undefined>) => api.get('/admin/companies', { params }),
  verificationRequests: (params?: Record<string, string | number | undefined>) =>
    api.get('/admin/companies/verification-requests', { params }),
  verifyCompany: (id: string, notes?: string) => api.patch(`/admin/companies/${id}/verify`, { notes }),
  rejectCompany: (id: string, reason: string) => api.patch(`/admin/companies/${id}/reject-verification`, { reason }),
  revokeCompany: (id: string, reason?: string) => api.patch(`/admin/companies/${id}/revoke`, { reason }),
  // Spec applications + pipeline
  applications: (params?: Record<string, string | number | undefined>) => api.get('/admin/applications', { params }),
  applicationDetail: (id: string) => api.get(`/admin/applications/${id}`),
  updateApplicationStatus: (id: string, status: string, notes?: string) =>
    api.patch(`/admin/applications/${id}/status`, { status, notes }),
  pipeline: (params?: Record<string, string | number | undefined>) => api.get('/admin/pipeline', { params }),
  // Spec disputes (#19–#21)
  disputes: (params?: Record<string, string | number | undefined>) => api.get('/admin/disputes', { params }),
  disputeDetail: (id: string) => api.get(`/admin/disputes/${id}`),
  resolveDispute: (id: string, payload: { resolution: string; action?: string; targetUser?: string }) =>
    api.patch(`/admin/disputes/${id}/resolve`, payload),
  // Spec analytics (#22), audit (#23–#24), settings, messaging (#25)
  detailedAnalytics: (dateRange?: number) => api.get('/admin/analytics/detailed', { params: { dateRange } }),
  auditLogs: (params?: Record<string, string | number | undefined>) => api.get('/admin/audit-logs', { params }),
  userActivity: (userId: string) => api.get(`/admin/activity-logs/${userId}`),
  platformSettings: () => api.get('/admin/settings'),
  updateSettings: (payload: Record<string, string>) => api.patch('/admin/settings', payload),
  adminAccounts: () => api.get('/admin/admins'),
  createAdminAccount: (payload: Record<string, unknown>) => api.post('/admin/admins', payload),
  messageUser: (userId: string, message: string, reason?: string) =>
    api.post(`/admin/message/${userId}`, { message, reason }),
  messagesOverview: (params?: Record<string, string | number | undefined>) =>
    api.get('/admin/messages/overview', { params }),
};
