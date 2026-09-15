import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.utils';
import { hashPassword, comparePassword, generateOTP, getOTPExpiry, isOTPValid } from '../utils/password.utils';
import { responses } from '../utils/response.utils';
import { sendWelcomeEmail, sendPasswordResetEmail, sendOTPEmail } from '../services/email.service';

export interface AuthRequest extends Request {
  userId?: string;
  email?: string;
  role?: string;
}

/**
 * POST /api/auth/register
 * Register a new user
 */
export async function register(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { name, password, role, nubId, department, companyName, industry } = req.body;
    const email = String(req.body.email || '').trim().toLowerCase();

    if (!/^[^\s@]+@gmail\.com$/i.test(email)) {
      return responses.badRequest(res, 'Please use a valid Gmail address');
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return responses.conflict(res, 'Email already registered');
    }

    // Hash password
    const hashedPassword = await hashPassword(password);
    const otp = generateOTP();
    const otpExpiry = getOTPExpiry();

    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role,
        isEmailVerified: false,
        otpCode: otp,
        otpExpiry,
        ...(role === 'STUDENT'
          ? {
              studentProfile: {
                create: {
                  nubId: nubId || undefined,
                  department: department || undefined,
                },
              },
            }
          : {
              employerProfile: {
                create: {
                  companyName: companyName || name,
                  about: industry ? `Industry: ${industry}` : undefined,
                },
              },
            }),
      },
    });

    await sendOTPEmail(user.email, otp, user.name);

    return responses.created(res, 'Verification code sent to your email. Please verify it to continue.', {
      userId: user.id,
      email: user.email,
      message: 'Check your inbox for the OTP code.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/verify-email
 * Verify email with OTP
 */
export async function verifyEmail(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { email, otp } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return responses.notFound(res, 'User not found');
    }

    if (user.isEmailVerified) {
      return responses.badRequest(res, 'Email already verified');
    }

    // Check OTP
    if (!user.otpCode || !user.otpExpiry) {
      return responses.badRequest(res, 'OTP not found. Please request a new one.');
    }

    if (!isOTPValid(user.otpCode, otp, user.otpExpiry)) {
      return responses.badRequest(res, 'Invalid or expired OTP');
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        otpCode: null,
        otpExpiry: null,
      },
    });

    await sendWelcomeEmail(updatedUser.email, updatedUser.name, updatedUser.role);

    return responses.ok(res, 'Email verified successfully. Please log in.', {
      email: updatedUser.email,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/login
 * Login with email and password
 */
export async function login(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return responses.unauthorized(res, 'Invalid email or password');
    }

    if (!user.isEmailVerified) {
      return responses.unauthorized(res, 'Please verify your email before logging in.');
    }

    // Compare password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return responses.unauthorized(res, 'Invalid email or password');
    }

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return responses.ok(res, 'Login successful', {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
export async function refresh(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return responses.badRequest(res, 'Refresh token is required');
    }

    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      return responses.unauthorized(res, 'Invalid or expired refresh token');
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      return responses.notFound(res, 'User not found');
    }

    // Generate new access token
    const newAccessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return responses.ok(res, 'Token refreshed', {
      accessToken: newAccessToken,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/forgot-password
 * Request password reset
 */
export async function forgotPassword(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return responses.ok(res, 'If email exists, reset link will be sent');
    }

    // Generate reset token (OTP)
    const resetOTP = generateOTP();
    const otpExpiry = getOTPExpiry();

    // Update user with reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetOtpCode: resetOTP,
        resetOtpExpiry: otpExpiry,
      },
    });

    // Send reset email
    const resetLink = `${process.env.CLIENT_URL}/reset-password?email=${email}&token=${resetOTP}`;
    await sendPasswordResetEmail(email, user.name, resetLink);

    return responses.ok(res, 'If email exists, reset link will be sent');
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/verify-otp
 * Verify OTP for password reset flow
 */
export async function verifyOTP(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { email, otp } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return responses.notFound(res, 'User not found');
    }

    if (!user.resetOtpCode || !user.resetOtpExpiry) {
      return responses.badRequest(res, 'No reset request found');
    }

    if (!isOTPValid(user.resetOtpCode, otp, user.resetOtpExpiry)) {
      return responses.badRequest(res, 'Invalid or expired OTP');
    }

    return responses.ok(res, 'OTP verified successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/reset-password
 * Reset password with OTP
 */
export async function resetPassword(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { email, otp, newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return responses.notFound(res, 'User not found');
    }

    // Check reset OTP
    if (!user.resetOtpCode || !user.resetOtpExpiry) {
      return responses.badRequest(res, 'No reset request found');
    }

    if (!isOTPValid(user.resetOtpCode, otp, user.resetOtpExpiry)) {
      return responses.badRequest(res, 'Invalid or expired reset token');
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetOtpCode: null,
        resetOtpExpiry: null,
      },
    });

    return responses.ok(res, 'Password reset successful');
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/logout
 * Logout user (client-side token removal)
 */
export async function logout(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    return responses.ok(res, 'Logout successful');
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/auth/me
 * Get current user info
 */
export async function getMe(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.userId) {
      return responses.unauthorized(res);
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isEmailVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      return responses.notFound(res, 'User not found');
    }

    return responses.ok(res, 'User fetched', { user });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/resend-otp
 * Resend OTP to email
 */
export async function resendOTP(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return responses.notFound(res, 'User not found');
    }

    if (user.isEmailVerified) {
      return responses.badRequest(res, 'Email already verified');
    }

    // Generate new OTP
    const otp = generateOTP();
    const otpExpiry = getOTPExpiry();

    await prisma.user.update({
      where: { id: user.id },
      data: {
        otpCode: otp,
        otpExpiry,
      },
    });

    // Send OTP email
    await sendOTPEmail(email, otp, user.name);

    return responses.ok(res, 'OTP sent to your email');
  } catch (error) {
    next(error);
  }
}