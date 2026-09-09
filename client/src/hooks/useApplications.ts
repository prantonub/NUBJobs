import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

export const useApplications = (status?: string, page?: number) => {
  return useQuery({
    queryKey: ['applications', status, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (page) params.append('page', String(page));
      const { data } = await api.get('/applications', { params });
      return data;
    },
  });
};

export const useApplicationDetail = (applicationId: string) => {
  return useQuery({
    queryKey: ['application', applicationId],
    queryFn: async () => {
      const { data } = await api.get(`/applications/${applicationId}`);
      return data.data;
    },
    enabled: !!applicationId,
  });
};

export const useApplicationStats = () => {
  return useQuery({
    queryKey: ['applicationStats'],
    queryFn: async () => {
      const { data } = await api.get('/applications/stats');
      return data.data;
    },
  });
};

export const useCreateApplication = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { jobId: string; coverLetter?: string }) => {
      const { data } = await api.post('/applications', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['applicationStats'] });
    },
  });
};

export const useUpdateApplication = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: {
      id: string;
      status?: string;
      notes?: string;
      coverLetter?: string;
    }) => {
      const { data } = await api.patch(`/applications/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });
};

export const useWithdrawApplication = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (applicationId: string) => {
      const { data } = await api.post(`/applications/${applicationId}/withdraw`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });
};