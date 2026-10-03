import { Router } from 'express';
import { z } from 'zod';
import {
  register,
  verifyEmail,
  verifyOTP,
  login,
  refresh,
  forgotPassword,
  resetPassword,
  logout,
  getMe,
  resendOTP,
  googleAuth,
  googleAuthCallback,
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
// Increased thresholds to avoid blocking normal user flows during development and
// repeated client retries while still limiting abuse.
router.post('/register', rateLimit(20, 15 * 60 * 1000), validate(registerSchema), register);
router.post('/verify-email', rateLimit(20, 15 * 60 * 1000), validate(verifyEmailSchema), verifyEmail);
router.post('/verify-otp', rateLimit(20, 15 * 60 * 1000), validate(verifyEmailSchema), verifyOTP);
router.post('/login', rateLimit(20, 15 * 60 * 1000), validate(loginSchema), login);
router.post('/refresh', rateLimit(50, 15 * 60 * 1000), validate(refreshSchema), refresh);
router.post('/forgot-password', rateLimit(10, 15 * 60 * 1000), validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', rateLimit(20, 15 * 60 * 1000), validate(resetPasswordSchema), resetPassword);
router.post('/resend-otp', rateLimit(10, 15 * 60 * 1000), validate(resendOTPSchema), resendOTP);

// Google OAuth ("Continue with Google").
// These are full-page browser redirects, so they are rate limited more loosely
// than the JSON endpoints — a user may retry the consent screen repeatedly.
router.get('/google', rateLimit(30, 15 * 60 * 1000), googleAuth);
router.get('/google/callback', rateLimit(30, 15 * 60 * 1000), googleAuthCallback);

// Protected routes
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);

export default router;