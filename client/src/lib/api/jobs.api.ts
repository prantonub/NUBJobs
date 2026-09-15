import api from '@/lib/axios';

export const jobsApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) =>
    api.get('/jobs', { params }),
  getById: (id: string) => api.get(`/jobs/${id}`),
  getMatchScore: (id: string) => api.get(`/jobs/${id}/match-score`),
  save: (id: string) => api.post(`/jobs/${id}/save`),
  unsave: (id: string) => api.delete(`/jobs/${id}/save`),
  checkSaved: (id: string) => api.get(`/jobs/${id}/saved`),
  saved: () => api.get('/jobs/saved'),
  recommended: () => api.get('/jobs/recommended'),
};
