import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

/**
 * Get list of jobs with filtering
 */
export const useJobs = (params?: {
  search?: string;
  category?: string;
  type?: string;
  location?: string;
  salaryMin?: number;
  salaryMax?: number;
  minCgpa?: number;
  targetUniversity?: string;
  sort?: 'newest' | 'salary-high' | 'salary-low' | 'views' | 'applicants';
  page?: number;
  limit?: number;
}) => {
  return useQuery({
    queryKey: ['jobs', params],
    queryFn: async () => {
      const { data } = await api.get('/jobs', { params });
      return data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Get single job detail
 */
export const useJobDetail = (jobId: string | null) => {
  return useQuery({
    queryKey: ['job', jobId],
    queryFn: async () => {
      if (!jobId) throw new Error('Job ID required');
      const { data } = await api.get(`/jobs/${jobId}`);
      return data.data;
    },
    enabled: !!jobId,
    staleTime: 10 * 60 * 1000,
  });
};

/**
 * Create new job
 */
export const useCreateJob = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (jobData: any) => {
      const { data } = await api.post('/jobs', jobData);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
};

/**
 * Update job
 */
export const useUpdateJob = (jobId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (jobData: any) => {
      const { data } = await api.put(`/jobs/${jobId}`, jobData);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
};

/**
 * Delete job
 */
export const useDeleteJob = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (jobId: string) => {
      await api.delete(`/jobs/${jobId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
};

/**
 * Get employer's jobs
 */
export const useMyJobs = (params?: { status?: string; page?: number; limit?: number }) => {
  return useQuery({
    queryKey: ['myJobs', params],
    queryFn: async () => {
      const { data } = await api.get('/jobs/employer/my', { params });
      return data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Toggle save job
 */
export const useSaveJob = (jobId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/jobs/${jobId}/save`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      queryClient.invalidateQueries({ queryKey: ['savedJobs'] });
    },
  });
};

/**
 * Get saved jobs
 */
export const useSavedJobs = (params?: { page?: number; limit?: number }) => {
  return useQuery({
    queryKey: ['savedJobs', params],
    queryFn: async () => {
      const { data } = await api.get('/jobs/saved', { params });
      return data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Get recommended jobs
 */
export const useRecommendedJobs = () => {
  return useQuery({
    queryKey: ['recommendedJobs'],
    queryFn: async () => {
      const { data } = await api.get('/jobs/recommended');
      return data.data;
    },
    staleTime: 10 * 60 * 1000,
  });
};