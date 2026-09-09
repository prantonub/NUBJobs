import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

export interface JobFilters {
  jobType?: string;
  category?: string;
  location?: string;
  salaryMin?: number;
  salaryMax?: number;
  minCgpa?: number;
  postedDays?: number;
  nubOnly?: boolean;
  sort?: string;
  page?: number;
  limit?: number;
}

export const useJobs = (filters: JobFilters = {}) => {
  return useQuery({
    queryKey: ['jobs', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
      const { data } = await api.get('/jobs', { params });
      return data;
    },
  });
};

export const useJobDetail = (jobId: string) => {
  return useQuery({
    queryKey: ['job', jobId],
    queryFn: async () => {
      const { data } = await api.get(`/jobs/${jobId}`);
      return data.data;
    },
    enabled: !!jobId,
  });
};

export const useJobMatchScore = (jobId: string) => {
  return useQuery({
    queryKey: ['matchScore', jobId],
    queryFn: async () => {
      const { data } = await api.get(`/jobs/${jobId}/match-score`);
      return data.data.matchScore;
    },
    enabled: !!jobId,
  });
};

export const useSaveJob = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (jobId: string) => {
      const { data } = await api.post(`/jobs/${jobId}/save`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedJobs'] });
    },
  });
};

export const useUnsaveJob = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (jobId: string) => {
      const { data } = await api.delete(`/jobs/${jobId}/save`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedJobs'] });
    },
  });
};

export const useCheckJobSaved = (jobId: string) => {
  return useQuery({
    queryKey: ['jobSaved', jobId],
    queryFn: async () => {
      const { data } = await api.get(`/jobs/${jobId}/saved`);
      return data.data.saved;
    },
    enabled: !!jobId,
  });
};

export const useSavedJobs = () => {
  return useQuery({
    queryKey: ['savedJobs'],
    queryFn: async () => {
      const { data } = await api.get('/saved-jobs');
      return data.data;
    },
  });
};

export const useRecommendedJobs = () => {
  return useQuery({
    queryKey: ['recommendedJobs'],
    queryFn: async () => {
      const { data } = await api.get('/jobs/recommended');
      return data.data;
    },
  });
};