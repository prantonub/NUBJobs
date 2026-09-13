import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

/**
 * Create new application
 */
export const useCreateApplication = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { jobId: string; coverLetter?: string }) => {
      const response = await api.post('/applications', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });
};

/**
 * Get student's applications
 */
export const useMyApplications = (params?: {
  status?: string;
  page?: number;
  limit?: number;
}) => {
  return useQuery({
    queryKey: ['applications', params],
    queryFn: async () => {
      const { data } = await api.get('/applications/my', { params });
      return data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Get applications for a job (employer only)
 */
export const useJobApplications = (
  jobId: string | null,
  params?: { status?: string; page?: number; limit?: number }
) => {
  return useQuery({
    queryKey: ['jobApplications', jobId, params],
    queryFn: async () => {
      if (!jobId) throw new Error('Job ID required');
      const { data } = await api.get(`/applications/job/${jobId}`, { params });
      return data.data;
    },
    enabled: !!jobId,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Get application detail
 */
export const useApplicationDetail = (applicationId: string | null) => {
  return useQuery({
    queryKey: ['application', applicationId],
    queryFn: async () => {
      if (!applicationId) throw new Error('Application ID required');
      const { data } = await api.get(`/applications/${applicationId}`);
      return data.data;
    },
    enabled: !!applicationId,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Update application status (employer only)
 */
export const useUpdateApplicationStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: string; status: string; notes?: string }) => {
      const { data: response } = await api.patch(`/applications/${data.id}/status`, {
        status: data.status,
        notes: data.notes,
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['application', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['jobApplications'] });
    },
  });
};

/**
 * Update application notes (employer only)
 */
export const useUpdateApplicationNotes = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: string; notes: string }) => {
      const { data: response } = await api.patch(`/applications/${data.id}/notes`, {
        notes: data.notes,
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['application', variables.id] });
    },
  });
};

/**
 * Withdraw application
 */
export const useWithdrawApplication = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (applicationId: string) => {
      await api.delete(`/applications/${applicationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });
};