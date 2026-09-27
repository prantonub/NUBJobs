'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

export interface ApplicationFilters {
  /** Any ApplicationStatus, or 'ALL'/undefined for everything. */
  status?: string;
  jobId?: string;
  sort?: 'newest' | 'oldest' | 'match';
  page?: number;
  limit?: number;
}

export interface ApplicationRow {
  id: string;
  jobId: string;
  status: string;
  matchScore: number;
  coverLetter: string | null;
  resumeUrl: string | null;
  notes?: string | null;
  createdAt: string;
  appliedAt: string;
  reviewedAt?: string | null;
  interviewDate?: string | null;
  job: {
    id: string;
    title: string;
    location?: string | null;
    salaryMin?: number | null;
    salaryMax?: number | null;
    status?: string;
    employer: {
      companyName: string;
      logoUrl?: string | null;
      isVerified?: boolean;
      location?: string | null;
    };
  };
  _count?: { messages: number };
}

export interface ApplicationStats {
  total: number;
  pending: number;
  shortlisted: number;
  interviewed: number;
  hired: number;
  /** Average match score across the student's applications (0-100). */
  avgMatchScore?: number;
  APPLIED?: number;
  REVIEWED?: number;
  SHORTLISTED?: number;
  INTERVIEWED?: number;
  HIRED?: number;
  REJECTED?: number;
  WITHDRAWN?: number;
}

export interface ApplicationListResult {
  data: ApplicationRow[];
  stats: ApplicationStats;
  pagination: { total: number; page: number; limit: number; pages: number };
}

function buildParams({ status, jobId, sort = 'newest', page = 1, limit = 20 }: ApplicationFilters) {
  const params: Record<string, string | number> = { sort, page, limit };
  if (status && status !== 'ALL') params.status = status;
  if (jobId) params.jobId = jobId;
  return params;
}

/**
 * GET /api/applications — the signed-in student's applications.
 * Returns rows + per-status stats + pagination metadata.
 */
export const useApplications = (filters: ApplicationFilters = {}) => {
  return useQuery({
    queryKey: ['applications', filters],
    queryFn: async () => {
      const { data } = await api.get('/applications', { params: buildParams(filters) });
      return data.data as ApplicationListResult;
    },
    staleTime: 30 * 1000,
    // Keeps the previous page visible while the next one loads (no table flash).
    placeholderData: (previous: ApplicationListResult | undefined) => previous,
  });
};

/** GET /api/applications/stats — counts for the dashboard cards. */
export const useApplicationStats = () => {
  return useQuery({
    queryKey: ['applicationStats'],
    queryFn: async () => {
      const { data } = await api.get('/applications/stats');
      return data.data as ApplicationStats;
    },
    staleTime: 60 * 1000,
  });
};

/**
 * GET /api/applications/:id — full detail (job, company, cover letter,
 * match breakdown, status timeline, messages).
 */
export const useApplicationDetail = (applicationId?: string | null) => {
  return useQuery({
    queryKey: ['application', applicationId],
    queryFn: async () => {
      const { data } = await api.get(`/applications/${applicationId}`);
      return data.data;
    },
    enabled: Boolean(applicationId),
    staleTime: 15 * 1000,
  });
};

/** POST /api/applications — apply for a job. */
export const useApplyJob = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { jobId: string; coverLetter?: string }) => {
      const { data } = await api.post('/applications', payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['applicationStats'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unreadCount'] });
    },
  });
};

/** POST /api/applications/:id/withdraw — student withdraws. */
export const useWithdrawApplication = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (applicationId: string) => {
      const { data } = await api.post(`/applications/${applicationId}/withdraw`);
      return data.data;
    },
    onSuccess: (_result, applicationId) => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['applicationStats'] });
      queryClient.invalidateQueries({ queryKey: ['application', applicationId] });
    },
  });
};

/** Alias kept for existing call sites (apply modal / older pages). */
export const useCreateApplication = useApplyJob;

