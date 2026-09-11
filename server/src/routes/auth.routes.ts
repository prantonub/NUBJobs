import { Router } from 'express';
import { z } from 'zod';
import {
  register,
  verifyEmail,
  login,
  refresh,
  forgotPassword,
  resetPassword,
  logout,
  getMe,
  resendOTP,
} from '../controllers/auth.controller';
import { authenticate, validate, rateLimit } from '../middleware/auth.middleware';

const router = Router();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(8),
  role: z.enum(['STUDENT', 'EMPLOYER']),
});

const verifyEmailSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
  newPassword: z.string().min(8),
});

const resendOTPSchema = z.object({
  email: z.string().email(),
});

// Rate limit auth routes
router.post('/register', rateLimit(5, 15 * 60 * 1000), validate(registerSchema), register);
router.post('/verify-email', rateLimit(5, 15 * 60 * 1000), validate(verifyEmailSchema), verifyEmail);
router.post('/login', rateLimit(5, 15 * 60 * 1000), validate(loginSchema), login);
router.post('/refresh', rateLimit(10, 15 * 60 * 1000), validate(refreshSchema), refresh);
router.post('/forgot-password', rateLimit(3, 15 * 60 * 1000), validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', rateLimit(5, 15 * 60 * 1000), validate(resetPasswordSchema), resetPassword);
router.post('/resend-otp', rateLimit(3, 15 * 60 * 1000), validate(resendOTPSchema), resendOTP);

// Protected routes
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);

export default router;