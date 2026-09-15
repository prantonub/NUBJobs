import api from '@/lib/axios';

export const applicationsApi = {
  list: (params?: Record<string, string | number | undefined>) => api.get('/applications', { params }),
  getById: (id: string) => api.get(`/applications/${id}`),
  stats: () => api.get('/applications/stats'),
  create: (payload: { jobId: string; coverLetter?: string }) => api.post('/applications', payload),
  update: (id: string, payload: { status?: string; notes?: string; coverLetter?: string }) =>
    api.patch(`/applications/${id}`, payload),
  withdraw: (id: string) => api.post(`/applications/${id}/withdraw`),
  matchScore: (id: string) => api.get(`/applications/${id}/match-score`),
};
