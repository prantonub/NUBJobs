import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

/**
 * Get public profile
 */
export const usePublicProfile = (userId: string | null) => {
  return useQuery({
    queryKey: ['publicProfile', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID required');
      const { data } = await api.get(`/profile/${userId}`);
      return data.data;
    },
    enabled: !!userId,
  });
};

/**
 * Get public student profile
 */
export const usePublicStudentProfile = (userId: string | null) => {
  return useQuery({
    queryKey: ['publicStudentProfile', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID required');
      const { data } = await api.get(`/profile/${userId}/public`);
      return data.data;
    },
    enabled: !!userId,
  });
};

/**
 * Update student profile
 */
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (profileData: any) => {
      const { data } = await api.put('/profile', profileData);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
  });
};

/**
 * Upload resume
 */
export const useUploadResume = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('resume', file);
      const { data } = await api.post('/profile/upload-resume', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
  });
};

/**
 * Upload profile photo
 */
export const useUploadPhoto = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('photo', file);
      const { data } = await api.post('/profile/upload-photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
  });
};

/**
 * Delete resume
 */
export const useDeleteResume = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.delete('/profile/resume');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
  });
};

/**
 * Delete profile photo
 */
export const useDeletePhoto = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.delete('/profile/photo');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
  });
};