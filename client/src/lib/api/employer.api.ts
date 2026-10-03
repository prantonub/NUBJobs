import api from '@/lib/axios';

/**
 * Employer-scoped API surface. Every endpoint below is authorised server-side
 * against the signed-in employer's own `EmployerProfile.id`, so the client can
 * never read or mutate another company's data.
 */
export const employerApi = {
  // ── Company profile ───────────────────────────────────────────────────────
  company: () => api.get('/employer/company'),
  updateCompany: (payload: Record<string, unknown>) => api.patch('/employer/company', payload),
  uploadLogo: (file: File) => {
    const formData = new FormData();
    formData.append('logo', file);
    return api.post('/employer/company/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deleteLogo: () => api.delete('/employer/company/logo'),
  verifyCompany: (payload: { verificationDocument?: string; verificationReason?: string }) =>
    api.post('/employer/company/verify', payload),
  uploadVerificationDocument: (file: File) => {
    const formData = new FormData();
    formData.append('document', file);
    return api.post('/employer/company/verification-document', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  verificationStatus: () => api.get('/employer/company/verification-status'),

  // ── Jobs ──────────────────────────────────────────────────────────────────
  jobs: (params?: Record<string, string | number | undefined>) =>
    api.get('/employer/jobs', { params }),
  job: (jobId: string) => api.get(`/employer/jobs/${jobId}`),
  postJob: (payload: Record<string, unknown>) => api.post('/jobs', payload),
  saveDraft: (payload: Record<string, unknown>) => api.post('/employer/jobs', payload),
  updateJob: (jobId: string, payload: Record<string, unknown>) =>
    api.patch(`/employer/jobs/${jobId}`, payload),
  deleteJob: (jobId: string) => api.delete(`/employer/jobs/${jobId}`),
  updateJobStatus: (jobId: string, action: 'close' | 'feature' | 'unfeature') =>
    api.patch(`/jobs/${jobId}/status`, { action }),

  // ── Applications ──────────────────────────────────────────────────────────
  applications: (params?: Record<string, string | number | undefined>) =>
    api.get('/employer/applications', { params }),
  application: (applicationId: string) => api.get(`/employer/applications/${applicationId}`),
  updateApplicationStatus: (applicationId: string, payload: { status: string; notes?: string }) =>
    api.patch(`/applications/${applicationId}/status`, payload),
  updateApplicationNotes: (applicationId: string, notes: string) =>
    api.patch(`/applications/${applicationId}/notes`, { notes }),

  // ── Analytics ─────────────────────────────────────────────────────────────
  stats: () => api.get('/employer/company/stats'),
  dashboardStats: () => api.get('/employer/dashboard/stats'),
};