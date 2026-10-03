import { randomBytes } from 'crypto';
import { hashPassword } from '../utils/password.utils';
import prisma from '../lib/prisma';

/**
 * Google OAuth 2.0 ("Continue with Google") — authorization-code flow.
 *
 * No SDK is required: the token exchange and the profile lookup are two plain
 * HTTPS calls, which Node's built-in `fetch` handles.
 *
 * Flow:
 *   1. GET /api/auth/google           -> redirect the browser to Google consent
 *   2. GET /api/auth/google/callback  -> verify `state`, exchange `code` for
 *      tokens, read the profile, upsert the user, hand tokens to the SPA.
 */

const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v3/userinfo';

/** Only what the app needs: id, email, name, picture. */
const GOOGLE_SCOPES = ['openid', 'email', 'profile'];

export interface GoogleConfig {
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  clientUrl: string;
}

/** Read + validate the Google env vars. */
export function getGoogleConfig(): GoogleConfig | null {
  const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
  const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim();
  const clientUrl = (process.env.CLIENT_URL || 'http://localhost:3000').trim();
  const callbackUrl = (
    process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback'
  ).trim();

  if (!clientId || !clientSecret) return null;

  return { clientId, clientSecret, callbackUrl, clientUrl };
}

export function isGoogleConfigured(): boolean {
  return getGoogleConfig() !== null;
}

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  emailVerified: boolean;
}

/**
 * Trim + cap a free-text value coming from the OAuth `state` payload. The state
 * is client-supplied (base64, not signed), so every field is treated as
 * untrusted input before it reaches the database.
 */
function clean(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLength);
}

/**
 * `state` carries the requested role/intent (plus optional signup extras)
 * through the Google round-trip. Role is re-validated when the account is
 * created, so a tampered value can never escalate privileges, and every extra
 * field is trimmed/capped by `clean()`.
 */
export function buildState(payload: {
  role?: string;
  intent?: string;
  nubId?: string;
  department?: string;
  companyName?: string;
}): string {
  const data = {
    role: payload.role === 'EMPLOYER' ? 'EMPLOYER' : 'STUDENT',
    intent: payload.intent === 'signup' ? 'signup' : 'login',
    nonce: randomBytes(12).toString('hex'),
    nubId: clean(payload.nubId, 30),
    department: clean(payload.department, 100),
    companyName: clean(payload.companyName, 120),
  };
  return Buffer.from(JSON.stringify(data)).toString('base64url');
}

export interface StatePayload {
  role: 'STUDENT' | 'EMPLOYER';
  intent: 'login' | 'signup';
  nonce: string;
  /** Optional signup extras — only used when a brand-new account is created. */
  extras: { nubId?: string; department?: string; companyName?: string };
}

/** Parse + normalise the `state` returned by Google (never throws). */
export function parseState(state: string | undefined): StatePayload {
  const fallback: StatePayload = { role: 'STUDENT', intent: 'login', nonce: '', extras: {} };
  if (!state) return fallback;

  try {
    const parsed = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
    const role: 'STUDENT' | 'EMPLOYER' = parsed?.role === 'EMPLOYER' ? 'EMPLOYER' : 'STUDENT';
    const extras = {
      nubId: role === 'STUDENT' ? clean(parsed?.nubId, 30) : undefined,
      department: role === 'STUDENT' ? clean(parsed?.department, 100) : undefined,
      companyName: role === 'EMPLOYER' ? clean(parsed?.companyName, 120) : undefined,
    };

    return {
      role,
      intent: parsed?.intent === 'signup' ? 'signup' : 'login',
      nonce: typeof parsed?.nonce === 'string' ? parsed.nonce : '',
      extras,
    };
  } catch {
    return fallback;
  }
}

/** The URL the browser is sent to for consent. */
export function buildConsentUrl(state: string): string {
  const config = getGoogleConfig();
  if (!config) {
    throw new Error('Google OAuth is not configured (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)');
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.callbackUrl,
    response_type: 'code',
    scope: GOOGLE_SCOPES.join(' '),
    // This app only needs a one-shot sign-in, so no refresh token is requested.
    access_type: 'online',
    include_granted_scopes: 'true',
    prompt: 'select_account',
    state,
  });

  return `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`;
}

/** Exchange the authorization code for tokens, then read the Google profile. */
export async function exchangeCodeForProfile(code: string): Promise<GoogleProfile> {
  const config = getGoogleConfig();
  if (!config) {
    throw new Error('Google OAuth is not configured');
  }

  const tokenResponse = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.callbackUrl,
      grant_type: 'authorization_code',
    }),
  });

  const tokens = (await tokenResponse.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!tokenResponse.ok || !tokens.access_token) {
    throw new Error(
      `Google token exchange failed: ${tokens.error_description || tokens.error || tokenResponse.status}`
    );
  }

  const profileResponse = await fetch(GOOGLE_USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  const profile = (await profileResponse.json()) as {
    sub?: string;
    email?: string;
    name?: string;
    picture?: string;
    email_verified?: boolean;
  };

  if (!profileResponse.ok || !profile.sub || !profile.email) {
    throw new Error('Could not read the Google profile (missing email or id)');
  }

  return {
    googleId: profile.sub,
    email: profile.email.trim().toLowerCase(),
    name: (profile.name || profile.email.split('@')[0]).trim(),
    avatarUrl: profile.picture ?? null,
    emailVerified: profile.email_verified !== false,
  };
}

export interface GoogleSignInResult {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    avatarUrl: string | null;
  };
  isNewUser: boolean;
}

/**
 * Find or create the local account for a Google profile.
 *
 * Matching order:
 *   1. `googleId` — the same Google account returning.
 *   2. `email`    — an existing email/password account is linked to Google, so
 *      a user who registered with OTP does not end up with two accounts.
 *
 * New accounts are created already verified (Google vouches for the email) and
 * with a random password, so the non-null `password` column stays satisfied and
 * password login simply does not work for them.
 */
export async function upsertGoogleUser(
  profile: GoogleProfile,
  role: 'STUDENT' | 'EMPLOYER',
  extra: { nubId?: string; department?: string; companyName?: string } = {}
): Promise<GoogleSignInResult> {
  const byGoogleId = await prisma.user.findUnique({
    where: { googleId: profile.googleId },
    select: { id: true, email: true, name: true, role: true, avatarUrl: true },
  });

  if (byGoogleId) {
    // Keep the profile fresh on every sign-in.
    const refreshed = await prisma.user.update({
      where: { id: byGoogleId.id },
      data: { name: profile.name, avatarUrl: profile.avatarUrl ?? byGoogleId.avatarUrl },
      select: { id: true, email: true, name: true, role: true, avatarUrl: true },
    });
    return { user: refreshed, isNewUser: false };
  }

  const byEmail = await prisma.user.findUnique({
    where: { email: profile.email },
    select: { id: true, email: true, name: true, role: true, avatarUrl: true },
  });

  if (byEmail) {
    // Link the existing account (Google verified the address, so the account
    // can be marked verified too).
    const linked = await prisma.user.update({
      where: { id: byEmail.id },
      data: {
        googleId: profile.googleId,
        name: profile.name,
        avatarUrl: profile.avatarUrl ?? byEmail.avatarUrl,
        isEmailVerified: true,
        otpCode: null,
        otpExpiry: null,
      },
      select: { id: true, email: true, name: true, role: true, avatarUrl: true },
    });
    return { user: linked, isNewUser: false };
  }

  // Random, unknown password: password login is impossible for these users
  // (they sign in with Google) but the column can never be empty.
  const placeholderPassword = await hashPassword(randomBytes(32).toString('hex'));

  const profileRelations = (withNubId: boolean) =>
    role === 'STUDENT'
      ? {
          studentProfile: {
            create: {
              nubId: withNubId ? extra.nubId || undefined : undefined,
              department: extra.department || undefined,
              photoUrl: profile.avatarUrl ?? undefined,
            },
          },
        }
      : {
          employerProfile: {
            create: {
              companyName: extra.companyName || profile.name,
              email: profile.email,
              logoUrl: profile.avatarUrl ?? undefined,
            },
          },
        };

  const baseUser = {
    email: profile.email,
    name: profile.name,
    password: placeholderPassword,
    role,
    provider: 'google',
    googleId: profile.googleId,
    avatarUrl: profile.avatarUrl,
    isEmailVerified: profile.emailVerified,
  };

  const select = { id: true, email: true, name: true, role: true, avatarUrl: true } as const;

  // Pre-check the NUB ID so a collision does not even reach the database (the
  // try/catch below stays as a race-condition guard).
  let nubIdAvailable = !!extra.nubId;
  if (role === 'STUDENT' && extra.nubId) {
    const taken = await prisma.studentProfile.findUnique({
      where: { nubId: extra.nubId },
      select: { id: true },
    });
    nubIdAvailable = !taken;
  }

  try {
    const created = await prisma.user.create({
      data: { ...baseUser, ...profileRelations(nubIdAvailable) },
      select,
    });
    return { user: created, isNewUser: true };
  } catch (error) {
    // A duplicate NUB ID (unique in StudentProfile) must not block sign-in —
    // create the account and let the student set/confirm the ID in their
    // profile instead (the register flow's NUB ID is equally unverified).
    const isNubIdConflict =
      typeof error === 'object' &&
      error !== null &&
      (error as { code?: string }).code === 'P2002' &&
      role === 'STUDENT' &&
      !!extra.nubId;

    if (!isNubIdConflict) throw error;

    const created = await prisma.user.create({
      data: { ...baseUser, ...profileRelations(false) },
      select,
    });
    return { user: created, isNewUser: true };
  }
}

/** Where the browser lands after a failed Google sign-in. */
export function buildErrorRedirect(preferSignup: boolean, message: string): string {
  const clientUrl = getGoogleConfig()?.clientUrl || 'http://localhost:3000';
  const path = preferSignup ? '/register' : '/login';
  return `${clientUrl}${path}?error=${encodeURIComponent(message)}`;
}

/** Where the browser lands after a successful Google sign-in. */
export function buildSuccessRedirect(
  accessToken: string,
  refreshToken: string,
  isNewUser: boolean,
  role: string
): string {
  const clientUrl = getGoogleConfig()?.clientUrl || 'http://localhost:3000';
  const params = new URLSearchParams({
    accessToken,
    refreshToken,
    isNew: String(isNewUser),
    role,
  });
  return `${clientUrl}/oauth/callback?${params.toString()}`;
}