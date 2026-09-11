import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

export const useEmployerStats = () => {
  return useQuery({
    queryKey: ['employerStats'],
    queryFn: async () => {
      const { data } = await api.get('/employer/dashboard/stats');
      return data.data;
    },
  });
};

export const useEmployerJobs = (status?: string, page?: number) => {
  return useQuery({
    queryKey: ['employerJobs', status, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (page) params.append('page', String(page));
      const { data } = await api.get('/employer/jobs', { params });
      return data.data;
    },
  });
};

export const useEmployerApplications = (jobId?: string) => {
  return useQuery({
    queryKey: ['employerApplications', jobId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (jobId) params.append('jobId', jobId);
      const { data } = await api.get('/employer/applications', { params });
      return data.data;
    },
  });
};

export const useApplicationDetail = (id: string) => {
  return useQuery({
    queryKey: ['applicationDetail', id],
    queryFn: async () => {
      const { data } = await api.get(`/employer/applications/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
};

export const useUpdateApplicationStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const { data } = await api.patch(`/employer/applications/${id}/status`, { status, notes });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employerApplications'] });
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
      const { data } = await api.get('/company/profile');
      return data.data;
    },
  });
};

export const useUpdateCompanyProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (profileData: any) => {
      const { data } = await api.patch('/company/profile', profileData);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companyProfile'] });
    },
  });
};

export const useUploadLogo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('logo', file);
      const { data } = await api.post('/company/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companyProfile'] });
    },
  });
};

export const useUploadVerificationDocument = () => {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('document', file);
      const { data } = await api.post('/company/verification-document', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data.data;
    },
  });
};

export const useRequestVerification = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { documentType: string; registrationNumber: string }) => {
      const { data } = await api.post('/company/request-verification', payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verificationStatus'] });
    },
  });
};

export const useVerificationStatus = () => {
  return useQuery({
    queryKey: ['verificationStatus'],
    queryFn: async () => {
      const { data } = await api.get('/company/verification-status');
      return data.data;
    },
  });
};