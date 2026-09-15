import api from '@/lib/axios';

export const adminApi = {
  stats: () => api.get('/admin/stats'),
  analytics: () => api.get('/admin/analytics'),
  database: () => api.get('/admin/database'),
  users: (params?: Record<string, string | number | undefined>) => api.get('/admin/users', { params }),
  updateUserRole: (id: string, role: string) => api.patch(`/admin/users/${id}/role`, { role }),
  toggleUserBan: (id: string, isBanned: boolean) => api.patch(`/admin/users/${id}/ban`, { isBanned }),
  removeUser: (id: string) => api.delete(`/admin/users/${id}`),
  jobs: () => api.get('/admin/jobs'),
  createJob: (payload: Record<string, unknown>) => api.post('/admin/jobs', payload),
  deleteJob: (id: string) => api.delete(`/admin/jobs/${id}`),
  updateJobStatus: (id: string, status: 'APPROVED' | 'REJECTED', reason?: string) =>
    api.patch(`/admin/jobs/${id}/status`, { status, reason }),
  toggleJobFeature: (id: string) => api.patch(`/admin/jobs/${id}/feature`),
  employers: () => api.get('/admin/employers'),
  createCompany: (payload: Record<string, unknown>) => api.post('/admin/companies', payload),
  deleteCompany: (id: string) => api.delete(`/admin/companies/${id}`),
  updateEmployerVerification: (id: string, approved: boolean, note?: string) =>
    api.patch(`/admin/employers/${id}/verify`, { approved, note }),
};
