import api from '@/lib/axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const unwrap = (res: any) => res?.data?.data ?? res?.data;

const listQuery = (key: string[], fn: (params: Record<string, any>) => Promise<any>) => {
  return (params: Record<string, any> = {}) => useQuery({ queryKey: [...key, params], queryFn: () => fn(params).then(unwrap) });
};

/** GET /api/admin/dashboard — spec endpoint #1. */
export const useAdminDashboard = () =>
  useQuery({ queryKey: ['admin', 'dashboard'], queryFn: () => api.get('/admin/dashboard').then(unwrap) });

/** GET /api/admin/users/all — spec endpoint #2. */
export const useAdminUsers = listQuery(['admin', 'users'], (p) => api.get('/admin/users/all', { params: p }));

/** GET /api/admin/jobs/all — spec endpoint #7. */
export const useAdminJobs = listQuery(['admin', 'jobs'], (p) => api.get('/admin/jobs/all', { params: p }));

/** GET /api/admin/companies — spec endpoint #13. */
export const useAdminCompanies = listQuery(['admin', 'companies'], (p) => api.get('/admin/companies', { params: p }));

/** GET /api/admin/companies/verification-requests — spec endpoint #14. */
export const useVerificationRequests = (params: Record<string, any> = {}) =>
  useQuery({ queryKey: ['admin', 'verification-requests', params], queryFn: () => api.get('/admin/companies/verification-requests', { params }).then(unwrap) });

/** GET /api/admin/applications — spec endpoint #17. */
export const useAdminApplications = listQuery(['admin', 'applications'], (p) => api.get('/admin/applications', { params: p }));

/** GET /api/admin/pipeline — read-only kanban (spec §5). */
export const useAdminPipeline = (params: Record<string, any> = {}) =>
  useQuery({ queryKey: ['admin', 'pipeline', params], queryFn: () => api.get('/admin/pipeline', { params }).then(unwrap) });

/** GET /api/admin/disputes — spec endpoint #19. */
export const useAdminDisputes = listQuery(['admin', 'disputes'], (p) => api.get('/admin/disputes', { params: p }));

/** GET /api/admin/analytics/detailed — spec endpoint #22. */
export const useAdminAnalytics = (dateRange = 30) =>
  useQuery({ queryKey: ['admin', 'analytics', dateRange], queryFn: () => api.get('/admin/analytics/detailed', { params: { dateRange } }).then(unwrap) });

/** GET /api/admin/audit-logs — spec endpoint #23. */
export const useAuditLogs = listQuery(['admin', 'audit-logs'], (p) => api.get('/admin/audit-logs', { params: p }));

/** GET /api/admin/settings — platform config (spec §10). */
export const usePlatformSettings = () =>
  useQuery({ queryKey: ['admin', 'settings'], queryFn: () => api.get('/admin/settings').then(unwrap) });

/** GET /api/admin/messages/overview — recent conversations (spec §6). */
export const useAdminMessagesOverview = listQuery(['admin', 'messages'], (p) => api.get('/admin/messages/overview', { params: p }));

/** GET /api/admin/admins — admin accounts (spec §10). */
export const useAdminAccounts = () =>
  useQuery({ queryKey: ['admin', 'accounts'], queryFn: () => api.get('/admin/admins').then(unwrap) });

function useAdminMutation<TVariables>(
  fn: (variables: TVariables) => Promise<any>,
  invalidate: string[][] = [['admin']]
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: TVariables) => unwrap(await fn(variables)),
    onSuccess: () => {
      for (const key of invalidate) queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

/** PATCH /api/admin/jobs/:id/approve — spec endpoint #9. */
export const useApproveJob = () =>
  useAdminMutation<{ id: string; notes?: string }>(({ id, notes }) => api.patch(`/admin/jobs/${id}/approve`, { notes }));

/** PATCH /api/admin/jobs/:id/reject — spec endpoint #10. */
export const useRejectJob = () =>
  useAdminMutation<{ id: string; reason: string }>(({ id, reason }) => api.patch(`/admin/jobs/${id}/reject`, { reason }));

/** PATCH /api/admin/jobs/:id/feature — spec endpoint #11. */
export const useFeatureJob = () =>
  useAdminMutation<{ id: string; featured?: boolean }>(({ id, featured }) => api.patch(`/admin/jobs/${id}/feature`, { featured }));

/** PATCH /api/admin/companies/:id/verify — spec endpoint #15. */
export const useVerifyCompany = () =>
  useAdminMutation<{ id: string; notes?: string }>(({ id, notes }) => api.patch(`/admin/companies/${id}/verify`, { notes }));

/** PATCH /api/admin/companies/:id/reject-verification — spec endpoint #16. */
export const useRejectCompany = () =>
  useAdminMutation<{ id: string; reason: string }>(({ id, reason }) => api.patch(`/admin/companies/${id}/reject-verification`, { reason }));

/** PATCH /api/admin/disputes/:id/resolve — spec endpoint #21. */
export const useResolveDispute = () =>
  useAdminMutation<{ id: string; payload: { resolution: string; action?: string; targetUser?: string } }>(({ id, payload }) =>
    api.patch(`/admin/disputes/${id}/resolve`, payload)
  );

/** PATCH /api/admin/users/:id/status — spec endpoint #4. */
export const useBanUser = () =>
  useAdminMutation<{ id: string; status: 'ACTIVE' | 'INACTIVE' | 'BANNED'; reason?: string }>(({ id, status, reason }) =>
    api.patch(`/admin/users/${id}/status`, { status, reason })
  );

/** POST /api/admin/users/:id/reset-password — spec endpoint #5. */
export const useResetPassword = () =>
  useAdminMutation<string>((id) => api.post(`/admin/users/${id}/reset-password`));

/** DELETE /api/admin/users/:id — spec endpoint #6. */
export const useDeleteUser = () =>
  useAdminMutation<string>((id) => api.delete(`/admin/users/${id}`));

/** POST /api/admin/message/:userId — spec endpoint #25. */
export const useSendAdminMessage = () =>
  useAdminMutation<{ userId: string; message: string; reason?: string }>(({ userId, message, reason }) =>
    api.post(`/admin/message/${userId}`, { message, reason })
  );

// ── Detail queries (spec endpoints #3, #8, #18, #20, #24) ────────────────────

/** GET /api/admin/users/:id/detail — spec endpoint #3. */
export const useAdminUserDetail = (id: string) =>
  useQuery({
    queryKey: ['admin', 'user', id],
    queryFn: () => api.get(`/admin/users/${id}/detail`).then(unwrap),
    enabled: !!id,
  });

/** GET /api/admin/jobs/:id/detail — spec endpoint #8. */
export const useAdminJobDetail = (id: string) =>
  useQuery({
    queryKey: ['admin', 'job', id],
    queryFn: () => api.get(`/admin/jobs/${id}/detail`).then(unwrap),
    enabled: !!id,
  });

/** GET /api/admin/applications/:id — spec endpoint #18. */
export const useAdminApplicationDetail = (id: string) =>
  useQuery({
    queryKey: ['admin', 'application', id],
    queryFn: () => api.get(`/admin/applications/${id}`).then(unwrap),
    enabled: !!id,
  });

/** GET /api/admin/disputes/:id — spec endpoint #20. */
export const useAdminDisputeDetail = (id: string) =>
  useQuery({
    queryKey: ['admin', 'dispute', id],
    queryFn: () => api.get(`/admin/disputes/${id}`).then(unwrap),
    enabled: !!id,
  });

/** GET /api/admin/activity-logs/:userId — spec endpoint #24. */
export const useUserActivityLog = (userId: string) =>
  useQuery({
    queryKey: ['admin', 'activity', userId],
    queryFn: () => api.get(`/admin/activity-logs/${userId}`, { params: { limit: 20 } }).then(unwrap),
    enabled: !!userId,
  });

// ── Remaining mutations ───────────────────────────────────────────────────────

/** PATCH /api/admin/jobs/:id/request-changes — send job back to the employer. */
export const useAdminRequestChanges = () =>
  useAdminMutation<{ id: string; reason: string }>(({ id, reason }) =>
    api.patch(`/admin/jobs/${id}/request-changes`, { reason })
  );

/** DELETE /api/admin/jobs/:id/remove — spec endpoint #12 (violation removal). */
export const useAdminRemoveJob = () =>
  useAdminMutation<{ id: string; reason: string }>(({ id, reason }) =>
    api.delete(`/admin/jobs/${id}/remove`, { data: { reason } })
  );

/** PATCH /api/admin/applications/:id/status — admin correction of application status. */
export const useAdminApplicationStatus = () =>
  useAdminMutation<{ id: string; status: string; notes?: string }>(({ id, status, notes }) =>
    api.patch(`/admin/applications/${id}/status`, { status, notes })
  );

/** PATCH /api/admin/companies/:id/revoke — revoke a verification badge. */
export const useRevokeCompany = () =>
  useAdminMutation<{ id: string; reason?: string }>(({ id, reason }) =>
    api.patch(`/admin/companies/${id}/revoke`, { reason })
  );

/** PATCH /api/admin/settings — platform configuration upsert. */
export const useUpdatePlatformSettings = () =>
  useAdminMutation<Record<string, string>>((payload) => api.patch('/admin/settings', payload));

/** POST /api/admin/admins — SUPER_ADMIN creates an admin account. */
export const useCreateAdminAccount = () =>
  useAdminMutation<Record<string, unknown>>((payload) => api.post('/admin/admins', payload), [['admin', 'accounts']]);
