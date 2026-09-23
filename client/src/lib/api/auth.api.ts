import api from '@/lib/axios';

export type UserRole = 'STUDENT' | 'EMPLOYER' | 'ADMIN' | 'MODERATOR';

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  /** Profile photo (students) or company logo (employers). */
  avatar?: string | null;
  photoUrl?: string | null;
}

export interface AuthLoginPayload {
  email: string;
  password: string;
}

export interface AuthRegisterPayload {
  email: string;
  name: string;
  password: string;
  role: 'STUDENT' | 'EMPLOYER';
}

export const authApi = {
  register: (payload: AuthRegisterPayload) => api.post('/auth/register', payload),
  verifyEmail: (payload: { email: string; otp: string }) => api.post('/auth/verify-email', payload),
  login: (payload: AuthLoginPayload) => api.post('/auth/login', payload),
  refresh: (refreshToken?: string) => api.post('/auth/refresh', { refreshToken: refreshToken ?? localStorage.getItem('refreshToken') }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (payload: { email: string; otp: string; newPassword: string }) => api.post('/auth/reset-password', payload),
  resendOtp: (email: string) => api.post('/auth/resend-otp', { email }),
};
