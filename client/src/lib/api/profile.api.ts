import api from '@/lib/axios';

export const profileApi = {
  get: () => api.get('/profile'),
  completion: () => api.get('/profile/completion'),
  eligibleJobs: () => api.get('/profile/eligible-jobs'),
  update: (payload: Record<string, unknown>) => api.patch('/profile', payload),
  uploadPhoto: (file: File) => {
    const formData = new FormData();
    formData.append('photo', file);
    return api.post('/profile/photo', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  uploadResume: (file: File) => {
    const formData = new FormData();
    formData.append('resume', file);
    return api.post('/profile/resume', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  analyzeResume: () => api.post('/profile/resume/analyze'),
};
