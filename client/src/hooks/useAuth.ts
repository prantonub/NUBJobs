import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { useEffect } from 'react';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'STUDENT' | 'EMPLOYER' | 'ADMIN';
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

/**
 * Get current user
 */
export const useCurrentUser = () => {
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/auth/me');
        return data.data.user;
      } catch (error) {
        return null;
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

/**
 * Register new user
 */
export const useRegister = () => {
  return useMutation({
    mutationFn: async (payload: {
      email: string;
      name: string;
      password: string;
      role: 'STUDENT' | 'EMPLOYER';
    }) => {
      const { data } = await api.post('/auth/register', payload);
      return data.data;
    },
  });
};

/**
 * Verify email with OTP
 */
export const useVerifyEmail = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { email: string; otp: string }) => {
      const { data } = await api.post('/auth/verify-email', payload);
      return data.data;
    },
    onSuccess: (response) => {
      // Store tokens
      if (response.accessToken && response.refreshToken) {
        localStorage.setItem('accessToken', response.accessToken);
        localStorage.setItem('refreshToken', response.refreshToken);
        // Update axios default header
        api.defaults.headers.common['Authorization'] = `Bearer ${response.accessToken}`;
        queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      }
    },
  });
};

/**
 * Login with email and password
 */
export const useLogin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { email: string; password: string }) => {
      const { data } = await api.post('/auth/login', payload);
      return data.data;
    },
    onSuccess: (response) => {
      if (response.accessToken && response.refreshToken) {
        localStorage.setItem('accessToken', response.accessToken);
        localStorage.setItem('refreshToken', response.refreshToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${response.accessToken}`;
        queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      }
    },
  });
};

/**
 * Refresh access token
 */
export const useRefreshToken = () => {
  return useMutation({
    mutationFn: async () => {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) throw new Error('No refresh token');

      const { data } = await api.post('/auth/refresh', { refreshToken });
      return data.data.accessToken;
    },
    onSuccess: (accessToken) => {
      localStorage.setItem('accessToken', accessToken);
      api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    },
  });
};

/**
 * Forgot password
 */
export const useForgotPassword = () => {
  return useMutation({
    mutationFn: async (email: string) => {
      const { data } = await api.post('/auth/forgot-password', { email });
      return data.data;
    },
  });
};

/**
 * Reset password with OTP
 */
export const useResetPassword = () => {
  return useMutation({
    mutationFn: async (payload: {
      email: string;
      otp: string;
      newPassword: string;
    }) => {
      const { data } = await api.post('/auth/reset-password', payload);
      return data.data;
    },
  });
};

/**
 * Logout
 */
export const useLogout = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.post('/auth/logout');
    },
    onSuccess: () => {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      delete api.defaults.headers.common['Authorization'];
      queryClient.clear();
    },
  });
};

/**
 * Resend OTP
 */
export const useResendOTP = () => {
  return useMutation({
    mutationFn: async (email: string) => {
      const { data } = await api.post('/auth/resend-otp', { email });
      return data.data;
    },
  });
};

/**
 * Main auth hook - combines all auth functions
 */
export const useAuth = () => {
  const currentUser = useCurrentUser();
  const registerMutation = useRegister();
  const verifyEmailMutation = useVerifyEmail();
  const loginMutation = useLogin();
  const logoutMutation = useLogout();
  const refreshTokenMutation = useRefreshToken();

  useEffect(() => {
    // Load tokens from localStorage and set axios header
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
      api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    }
  }, []);

  return {
    // User state
    user: currentUser.data,
    isLoading: currentUser.isLoading,
    isAuthenticated: !!currentUser.data,
    userRole: currentUser.data?.role,

    // Auth functions
    register: registerMutation.mutateAsync,
    verifyEmail: verifyEmailMutation.mutateAsync,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    refreshToken: refreshTokenMutation.mutateAsync,

    // Mutation states
    registerLoading: registerMutation.isPending,
    verifyEmailLoading: verifyEmailMutation.isPending,
    loginLoading: loginMutation.isPending,
    logoutLoading: logoutMutation.isPending,

    // Errors
    registerError: registerMutation.error,
    loginError: loginMutation.error,
  };
};