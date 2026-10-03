import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

/**
 * Job lists and job detail pages embed the employer's public identity
 * (`companyName`, `logoUrl`, `isVerified`) and are cached client-side
 * (`staleTime` of 5 minutes in the job hooks). After the company name or logo
 * changes we must drop those caches, otherwise job cards keep rendering the old
 * company name and logo until they expire.
 */
function invalidatePublicCompanyIdentity(queryClient: QueryClient) {
  for (const queryKey of [
    ['jobs'],
    ['job'],
    ['recommendedJobs'],
    ['savedJobs'],
    ['myJobs'],
    ['employerJobs'],
    ['jobCategories'],
  ]) {
    queryClient.invalidateQueries({ queryKey });
  }
}

export const useEmployerStats = () => {
  return useQuery({
    queryKey: ['employerStats'],
    queryFn: async () => {
      const { data } = await api.get('/employer/dashboard/stats');
      return data.data;
    },
  });
};

export type EmployerJobsFilters = {
  status?: string;
  sort?: 'newest' | 'oldest' | 'applicants' | 'views';
  page?: number;
  limit?: number;
};

/**
 * GET /api/employer/jobs — the employer's OWN postings only.
 * Accepts either `useEmployerJobs('ACTIVE', 2)` or `useEmployerJobs({ status, sort, page, limit })`.
 */
export const useEmployerJobs = (
  statusOrFilters?: string | EmployerJobsFilters,
  pageArg?: number,
  optionsArg: { sort?: EmployerJobsFilters['sort']; limit?: number } = {}
) => {
  const filters: EmployerJobsFilters =
    typeof statusOrFilters === 'object'
      ? statusOrFilters
      : { status: statusOrFilters, page: pageArg, ...optionsArg };

  const { status, sort = 'newest', page, limit = 20 } = filters;

  return useQuery({
    queryKey: ['employerJobs', status, page, sort, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      // 'ALL'/undefined → no status filter (the API returns every status then).
      if (status && status !== 'ALL') params.append('status', status);
      if (page) params.append('page', String(page));
      params.append('sort', sort);
      params.append('limit', String(limit));
      const { data } = await api.get('/employer/jobs', { params });
      return data.data;
    },
  });
};

/** GET /api/employer/jobs/:id — one of the employer's own jobs (403 otherwise). */
export const useEmployerJobDetail = (jobId?: string | null) => {
  return useQuery({
    queryKey: ['employerJob', jobId],
    queryFn: async () => {
      const { data } = await api.get(`/employer/jobs/${jobId}`);
      return data.data;
    },
    enabled: Boolean(jobId),
    staleTime: 30 * 1000,
  });
};

/**
 * GET /api/employer/applications — applications for the employer's OWN jobs.
 * Without filters/with only `jobId` it returns the grouped kanban payload;
 * the applications table uses `useEmployerApplicationsList` (`?view=list`).
 */
export const useEmployerApplications = (filters: { jobId?: string } = {}) => {
  const { jobId } = filters;
  return useQuery({
    queryKey: ['employerApplications', jobId ?? null],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (jobId) params.jobId = jobId;
      const { data } = await api.get('/employer/applications', { params });
      return data.data;
    },
  });
};

/**
 * Application detail for the employer (GET /api/employer/applications/:id).
 * Delegates to `useEmployerApplicationDetail` so there is a single cache key
 * (`employerApplication`) that the realtime hook invalidates.
 */
export const useApplicationDetail = (id: string) => useEmployerApplicationDetail(id);

export const useUpdateApplicationStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const { data } = await api.patch(`/employer/applications/${id}/status`, { status, notes });
      return data.data;
    },
    onSuccess: (_result, variables) => {
      // Every employer-facing surface that shows this application.
      queryClient.invalidateQueries({ queryKey: ['employerApplications'] });
      queryClient.invalidateQueries({ queryKey: ['employerApplicationsList'] });
      queryClient.invalidateQueries({ queryKey: ['employerApplication', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['jobApplicants'] });
      queryClient.invalidateQueries({ queryKey: ['employerStats'] });
    },
  });
};

/** PATCH /api/applications/:id/notes — private employer notes on a candidate. */
export const useUpdateApplicationNotes = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { data } = await api.patch(`/applications/${id}/notes`, { notes });
      return data.data;
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employerApplication', variables.id] });
    },
  });
};

export const useScheduleInterview = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      date,
      time,
      link,
      notes,
    }: {
      id: string;
      date: string;
      time: string;
      link?: string;
      notes?: string;
    }) => {
      const { data } = await api.post(`/employer/applications/${id}/schedule-interview`, {
        date,
        time,
        link,
        notes,
      });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employerApplications'] });
      queryClient.invalidateQueries({ queryKey: ['applicationDetail'] });
    },
  });
};

export const useCreateJob = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (jobData: any) => {
      const { data } = await api.post('/employer/jobs', jobData);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employerJobs'] });
    },
  });
};

export const useUpdateJob = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...jobData }: { id: string } & any) => {
      const { data } = await api.patch(`/employer/jobs/${id}`, jobData);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employerJobs'] });
    },
  });
};

export const usePublishJob = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (jobId: string) => {
      const { data } = await api.post(`/employer/jobs/${jobId}/publish`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employerJobs'] });
      queryClient.invalidateQueries({ queryKey: ['employerStats'] });
    },
  });
};

export const useCloseJob = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (jobId: string) => {
      const { data } = await api.post(`/employer/jobs/${jobId}/close`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employerJobs'] });
    },
  });
};

export const useDeleteJob = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (jobId: string) => {
      const { data } = await api.delete(`/employer/jobs/${jobId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employerJobs'] });
    },
  });
};

export const usePreviewJob = (jobId?: string) => {
  return useQuery({
    queryKey: ['jobPreview', jobId],
    queryFn: async () => {
      const { data } = await api.get(`/employer/jobs/${jobId}/preview`);
      return data.data;
    },
    enabled: !!jobId,
  });
};

export const useImproveDescription = () => {
  return useMutation({
    mutationFn: async (description: string) => {
      const { data } = await api.post('/employer/jobs/improve-description', {
        description,
      });
      return data.data;
    },
  });
};

export const useCompanyProfile = () => {
  return useQuery({
    queryKey: ['companyProfile'],
    queryFn: async () => {
      // Employer-scoped endpoint (spec): GET /api/employer/company
      const { data } = await api.get('/employer/company');
      return data.data;
    },
  });
};

export const useUpdateCompanyProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (profileData: any) => {
      const { data } = await api.patch('/employer/company', profileData);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companyProfile'] });
      invalidatePublicCompanyIdentity(queryClient);
    },
  });
};

export const useUploadLogo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('logo', file);
      const { data } = await api.post('/employer/company/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companyProfile'] });
      invalidatePublicCompanyIdentity(queryClient);
    },
  });
};

export const useUploadVerificationDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('document', file);
      const { data } = await api.post('/employer/company/verification-document', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companyProfile'] });
    },
  });
};

/**
 * Submit the company for verification.
 * Accepts the spec payload `{ verificationDocument, verificationReason }` and
 * the legacy `{ documentType, registrationNumber }` shape.
 */
export const useRequestVerification = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      verificationDocument?: string;
      verificationReason?: string;
      documentType?: string;
      registrationNumber?: string;
    }) => {
      const { data } = await api.post('/employer/company/verify', payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verificationStatus'] });
      queryClient.invalidateQueries({ queryKey: ['companyProfile'] });
    },
  });
};

export const useVerificationStatus = () => {
  return useQuery({
    queryKey: ['verificationStatus'],
    queryFn: async () => {
      const { data } = await api.get('/employer/company/verification-status');
      return data.data;
    },
  });
};

export const useDeleteLogo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.delete('/employer/company/logo');
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companyProfile'] });
      invalidatePublicCompanyIdentity(queryClient);
    },
  });
};

export const useCompanyStats = () => {
  return useQuery({
    queryKey: ['companyStats'],
    queryFn: async () => {
      const { data } = await api.get('/company/stats');
      return data.data;
    },
    staleTime: 60 * 1000,
  });
};

// ── Applications (employer) ─────────────────────────────────────────────────

export interface EmployerApplicationFilters {
  status?: string;
  jobId?: string;
  sort?: 'newest' | 'oldest' | 'match';
  page?: number;
  limit?: number;
}

/**
 * GET /api/employer/applications?view=list — flat, filterable, paginated list
 * (the kanban `useEmployerApplications` keeps the grouped shape).
 */
export const useEmployerApplicationsList = (filters: EmployerApplicationFilters = {}) => {
  const { status, jobId, sort = 'newest', page = 1, limit = 20 } = filters;
  return useQuery({
    queryKey: ['employerApplicationsList', { status, jobId, sort, page, limit }],
    queryFn: async () => {
      const params: Record<string, string | number> = { view: 'list', sort, page, limit };
      if (status && status !== 'ALL') params.status = status;
      if (jobId) params.jobId = jobId;
      const { data } = await api.get('/employer/applications', { params });
      return data.data;
    },
    staleTime: 30 * 1000,
    placeholderData: (previous: any) => previous,
  });
};

/** GET /api/employer/applications/:id — candidate profile + timeline + chat. */
export const useEmployerApplicationDetail = (applicationId?: string | null) => {
  return useQuery({
    queryKey: ['employerApplication', applicationId],
    queryFn: async () => {
      const { data } = await api.get(`/employer/applications/${applicationId}`);
      return data.data;
    },
    enabled: Boolean(applicationId),
    staleTime: 15 * 1000,
  });
};

/** GET /api/applications/job/:jobId — every applicant of one posting. */
export const useJobApplicants = (
  jobId?: string | null,
  filters: { status?: string; page?: number; limit?: number } = {}
) => {
  return useQuery({
    queryKey: ['jobApplicants', jobId, filters],
    queryFn: async () => {
      const { data } = await api.get(`/applications/job/${jobId}`, { params: filters });
      return data.data;
    },
    enabled: Boolean(jobId),
    staleTime: 30 * 1000,
  });
};

// ── Job management (employer) ───────────────────────────────────────────────

/**
 * POST /api/jobs — every posting goes to PENDING and notifies the admins.
 * Pass `{ asDraft: true }` to save through the draft endpoint instead.
 *
 * NOTE: `useUpdateJob` / `useDeleteJob` above already cover the draft flow
 * (PATCH/DELETE /api/employer/jobs/:id); the equivalents on /api/jobs/:id are
 * mounted too and share the same controllers' rules.
 */
export const usePostJob = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      asDraft = false,
      ...payload
    }: Record<string, unknown> & { asDraft?: boolean }) => {
      const { data } = await api.post(asDraft ? '/employer/jobs' : '/jobs', payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employerJobs'] });
      queryClient.invalidateQueries({ queryKey: ['employerStats'] });
    },
  });
};

/** PATCH /api/jobs/:id/status — close or feature a posting. */
export const useUpdateJobStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'close' | 'feature' | 'unfeature' }) => {
      const { data } = await api.patch(`/jobs/${id}/status`, { action });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employerJobs'] });
      queryClient.invalidateQueries({ queryKey: ['companyAnalytics'] });
    },
  });
};

/** DELETE /api/jobs/:id — only DRAFT postings can be deleted. */
export const useDeleteJobPosting = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/employer/jobs/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employerJobs'] });
      queryClient.invalidateQueries({ queryKey: ['employerStats'] });
    },
  });
};

/** GET /api/employer/company/stats — overview, charts, top jobs and metrics. */
export const useCompanyAnalytics = () => {
  return useQuery({
    queryKey: ['companyAnalytics'],
    queryFn: async () => {
      const { data } = await api.get('/employer/company/stats');
      return data.data;
    },
    staleTime: 60 * 1000,
  });
};

// ── Spec-named aliases ──────────────────────────────────────────────────────
// The employer surfaces in the spec use these names; they are thin aliases over
// the implementations above so there is exactly ONE query per endpoint.

/** Alias of `useCompanyProfile` (GET /api/employer/company). */
export const useEmployerCompany = useCompanyProfile;
/** Alias of `useUpdateCompanyProfile` (PATCH /api/employer/company). */
export const useUpdateCompany = useUpdateCompanyProfile;
/** Alias of `useCompanyAnalytics` (GET /api/employer/company/stats). */
export const useEmployerAnalytics = useCompanyAnalytics;