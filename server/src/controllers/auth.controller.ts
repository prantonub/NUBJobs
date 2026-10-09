import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { removeStoredFile } from '../lib/cloudinary';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.utils';
import { hashPassword, comparePassword, generateOTP, getOTPExpiry, isOTPValid } from '../utils/password.utils';
import { responses } from '../utils/response.utils';
import { sendWelcomeEmail, sendPasswordResetEmail, sendOTPEmail } from '../services/email.service';
import {
  buildConsentUrl,
  buildErrorRedirect,
  buildState,
  buildSuccessRedirect,
  exchangeCodeForProfile,
  isGoogleConfigured,
  parseState,
  upsertGoogleUser,
} from '../services/google-oauth.service';

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
        username: user.username,
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
 * GET /api/auth/google
 * Start Google OAuth. Bounces the browser to Google's consent screen; the
 * requested role ("STUDENT"|"EMPLOYER") travels inside the signed-in-practice
 * `state` value. With `?json=1` the consent URL is returned as JSON instead of
 * redirecting, which makes the endpoint testable without a browser.
 */
export async function googleAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!isGoogleConfigured()) {
      return responses.badRequest(
        res,
        'Google sign-in is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.'
      );
    }

    const role = typeof req.query.role === 'string' ? req.query.role : undefined;
    const intent = typeof req.query.intent === 'string' ? req.query.intent : undefined;
    const state = buildState({
      role,
      intent,
      nubId: typeof req.query.nubId === 'string' ? req.query.nubId : undefined,
      department: typeof req.query.department === 'string' ? req.query.department : undefined,
      companyName: typeof req.query.companyName === 'string' ? req.query.companyName : undefined,
    });
    const consentUrl = buildConsentUrl(state);

    if (req.query.json === '1') {
      return responses.ok(res, 'Google consent URL', { url: consentUrl, state });
    }

    return res.redirect(consentUrl);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/auth/google/callback
 * Google redirects here with `?code=...&state=...` (or `?error=...`). We verify
 * the state, exchange the code for the Google profile, then upsert the local
 * account and hand the SPA a pair of tokens. The tokens are passed in the query
 * string of the SPA callback route, which stores them and immediately scrubs
 * the URL (see client/src/app/oauth/callback/page.tsx).
 */
export async function googleAuthCallback(req: AuthRequest, res: Response, next: NextFunction) {
  const preferSignup = parseState(typeof req.query.state === 'string' ? req.query.state : undefined)
    .intent === 'signup';

  try {
    if (!isGoogleConfigured()) {
      return res.redirect(
        buildErrorRedirect(preferSignup, 'Google sign-in is not configured on the server.')
      );
    }

    // Google reports user-side failures (consent denied, etc.) via `?error=`.
    const googleError = typeof req.query.error === 'string' ? req.query.error : undefined;
    if (googleError) {
      return res.redirect(
        buildErrorRedirect(
          preferSignup,
          googleError === 'access_denied'
            ? 'Google sign-in was cancelled.'
            : 'Google sign-in failed. Please try again.'
        )
      );
    }

    const code = typeof req.query.code === 'string' ? req.query.code : undefined;
    if (!code) {
      return res.redirect(buildErrorRedirect(preferSignup, 'Missing authorization code.'));
    }

    const { role, extras } = parseState(
      typeof req.query.state === 'string' ? req.query.state : undefined
    );
    const profile = await exchangeCodeForProfile(code);

    // Preserve the requested role for accounts that already exist: an existing
    // user keeps the role on their record (never silently switch it). `extras`
    // are only used when a brand-new account is created.
    const { user, isNewUser } = await upsertGoogleUser(profile, role, extras);

    const account = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, name: true, role: true, isBanned: true },
    });

    if (!account || account.isBanned) {
      return res.redirect(
        buildErrorRedirect(preferSignup, 'This account has been suspended. Contact support.')
      );
    }

    const accessToken = generateAccessToken({
      userId: account.id,
      email: account.email,
      role: account.role,
    });
    const refreshToken = generateRefreshToken({
      userId: account.id,
      email: account.email,
      role: account.role,
    });

    return res.redirect(buildSuccessRedirect(accessToken, refreshToken, isNewUser, account.role));
  } catch (error) {
    // Never dump a stack trace into the browser Ã¢â‚¬â€ log it and return a friendly
    // message to the SPA so the user can retry.
    console.error('Google OAuth callback failed:', error);
    return res.redirect(
      buildErrorRedirect(
        preferSignup,
        'Google sign-in failed. Please try again or use email and password.'
      )
    );
  }
}

/**
 * DELETE /api/auth/account
 * Permanently delete the authenticated user's own account.
 *
 * Local accounts must send their current password in the body as
 * `{ password }`. Google accounts (`provider: "google"`) have no usable
 * password, so they must instead send `{ confirmEmail }` matching their own
 * account email.
 *
 * Protected accounts are never deleted: admins/moderators, and the final
 * remaining admin in the database (so the platform can always be managed).
 * Related rows (profiles, applications, saved jobs, messages, notifications,
 * events, RSVPs, jobs) are removed by the schema's `onDelete: Cascade` rules;
 * uploaded files are deleted from Cloudinary first so no orphan assets remain.
 */
export async function deleteAccount(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    if (!userId) {
      return responses.unauthorized(res);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        password: true,
        provider: true,
        studentProfile: { select: { photoUrl: true, resumeUrl: true } },
        employerProfile: { select: { logoUrl: true, verificationDocument: true } },
      },
    });

    if (!user) {
      return responses.notFound(res, 'Account not found');
    }

    if (user.role !== 'STUDENT' && user.role !== 'EMPLOYER') {
      // Admins/moderators are managed from the admin panel Ã¢â‚¬â€ never here, so an
      // account with elevated privileges can't be removed through this flow.
      return responses.forbidden(res, 'Only student and employer accounts can be deleted here');
    }

    const body = (req.body ?? {}) as { password?: unknown; confirmEmail?: unknown };
    if (user.provider === 'google') {
      const confirmEmail = typeof body.confirmEmail === 'string' ? body.confirmEmail.trim().toLowerCase() : '';
      if (confirmEmail !== user.email.toLowerCase()) {
        return responses.badRequest(res, 'Type your account email to confirm deletion');
      }
    } else {
      const password = typeof body.password === 'string' ? body.password : '';
      if (!password) {
        return responses.badRequest(res, 'Your current password is required');
      }
      const matches = await comparePassword(password, user.password);
      if (!matches) {
        return responses.unauthorized(res, 'Incorrect password');
      }
    }

    // Best effort: delete uploaded files before the DB rows disappear.
    const uploadedFiles = [
      user.studentProfile?.photoUrl,
      user.studentProfile?.resumeUrl,
      user.employerProfile?.logoUrl,
      user.employerProfile?.verificationDocument,
    ].filter((fileUrl): fileUrl is string => typeof fileUrl === 'string' && fileUrl.length > 0);
    await Promise.all(uploadedFiles.map((fileUrl) => removeStoredFile(fileUrl)));

    await prisma.user.delete({ where: { id: user.id } });

    return responses.ok(res, 'Account deleted');
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
        // "local" vs "google" Ã¢â‚¬â€ drives how the client confirms account deletion.
        provider: true,
        createdAt: true,
        // Social platform: @username profile link + local avatar.
        username: true,
        avatarUrl: true,
        // Used by the navbar / sidebar avatar.
        studentProfile: { select: { photoUrl: true } },
        employerProfile: { select: { logoUrl: true } },
      },
    });

    if (!user) {
      return responses.notFound(res, 'User not found');
    }

    const { studentProfile, employerProfile, ...rest } = user;
    const avatar = studentProfile?.photoUrl ?? employerProfile?.logoUrl ?? null;

    return responses.ok(res, 'User fetched', { user: { ...rest, avatar, photoUrl: avatar } });
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
