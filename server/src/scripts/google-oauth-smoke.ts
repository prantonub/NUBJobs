import 'dotenv/config';

/**
 * Live smoke test for the Google OAuth service (no browser, no Google network
 * calls). Verifies the pieces the callback depends on:
 *
 *   1. `buildState` / `parseState` round-trip (role + signup extras).
 *   2. `buildConsentUrl` carries the right client_id / redirect_uri / scope.
 *   3. `upsertGoogleUser` creates, refreshes, links by email and survives a
 *      duplicate NUB ID — then everything it created is deleted again.
 *
 * Run: cd server && npx ts-node src/scripts/google-oauth-smoke.ts
 */
import { randomBytes } from 'crypto';
import prisma from '../lib/prisma';
import { hashPassword } from '../utils/password.utils';
import { generateAccessToken, verifyAccessToken } from '../utils/jwt.utils';
import {
  buildConsentUrl,
  buildErrorRedirect,
  buildState,
  buildSuccessRedirect,
  parseState,
  upsertGoogleUser,
  type GoogleProfile,
} from '../services/google-oauth.service';

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, detail?: unknown) {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${name}${detail !== undefined ? ` -> ${JSON.stringify(detail)}` : ''}`);
  }
}

const runId = Date.now().toString(36);
const createdUserIds: string[] = [];

function profile(overrides: Partial<GoogleProfile> = {}): GoogleProfile {
  return {
    googleId: `gt-${runId}-${randomBytes(4).toString('hex')}`,
    email: `nubjobs.gtest.${runId}.${randomBytes(4).toString('hex')}@gmail.com`,
    name: 'Google Test User',
    avatarUrl: 'https://lh3.googleusercontent.com/a/test-avatar',
    emailVerified: true,
    ...overrides,
  };
}

async function main() {
  console.log('\nGoogle OAuth service smoke test\n');

  // ── 1. state round-trip ────────────────────────────────────────────────────
  const state = buildState({
    role: 'EMPLOYER',
    intent: 'signup',
    nubId: 'SHOULD-BE-DROPPED',
    companyName: '  Acme Ltd  ',
  });
  const parsed = parseState(state);
  check('state keeps the requested role', parsed.role === 'EMPLOYER', parsed.role);
  check('state keeps the intent', parsed.intent === 'signup', parsed.intent);
  check('state trims the company name', parsed.extras.companyName === 'Acme Ltd', parsed.extras);
  check(
    'state drops student extras for an employer',
    parsed.extras.nubId === undefined && parsed.extras.department === undefined,
    parsed.extras
  );
  const fallback = parseState('not-base64-json');
  check(
    'unknown state falls back to STUDENT/login',
    fallback.role === 'STUDENT' && fallback.intent === 'login'
  );

  // ── 2. consent URL ─────────────────────────────────────────────────────────
  const consentUrl = new URL(buildConsentUrl(state));
  const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
  check('consent URL points at Google', consentUrl.hostname === 'accounts.google.com', consentUrl.hostname);
  check('consent URL sends the client id', consentUrl.searchParams.get('client_id') === clientId);
  check(
    'consent URL sends the configured callback',
    consentUrl.searchParams.get('redirect_uri') === process.env.GOOGLE_CALLBACK_URL,
    consentUrl.searchParams.get('redirect_uri')
  );
  check(
    'consent URL requests openid/email/profile',
    consentUrl.searchParams.get('scope') === 'openid email profile',
    consentUrl.searchParams.get('scope')
  );
  check('consent URL echoes the state', consentUrl.searchParams.get('state') === state);

  // ── 2b. redirect contract expected by client/src/app/oauth/callback ────────
  const success = new URL(buildSuccessRedirect('access-123', 'refresh-456', true, 'EMPLOYER'));
  const clientUrl = (process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '');
  check('success redirect targets the SPA callback', success.origin === new URL(clientUrl).origin, success.origin);
  check('success redirect path is /oauth/callback', success.pathname === '/oauth/callback', success.pathname);
  check('success redirect carries the access token', success.searchParams.get('accessToken') === 'access-123');
  check('success redirect carries the refresh token', success.searchParams.get('refreshToken') === 'refresh-456');
  check('success redirect flags a new user', success.searchParams.get('isNew') === 'true', success.searchParams.get('isNew'));
  check('success redirect carries the role', success.searchParams.get('role') === 'EMPLOYER');

  const signupError = new URL(buildErrorRedirect(true, 'Google sign-in was cancelled.'));
  const loginError = new URL(buildErrorRedirect(false, 'Google sign-in was cancelled.'));
  check('signup error returns to /register', signupError.pathname === '/register', signupError.pathname);
  check('login error returns to /login', loginError.pathname === '/login', loginError.pathname);
  check(
    'error message is encoded in the query string',
    signupError.searchParams.get('error') === 'Google sign-in was cancelled.',
    signupError.searchParams.get('error')
  );

  // ── 3. upsertGoogleUser ────────────────────────────────────────────────────
  const studentProfile = profile();
  const nubId = `GT${runId.toUpperCase()}`.slice(0, 20);
  const first = await upsertGoogleUser(studentProfile, 'STUDENT', {
    nubId,
    department: 'CSE',
  });
  createdUserIds.push(first.user.id);
  check('new student is created', first.isNewUser === true);
  check('new student gets the requested role', first.user.role === 'STUDENT', first.user.role);
  check('new student keeps the Google avatar', !!first.user.avatarUrl);

  const storedStudent = await prisma.user.findUnique({
    where: { id: first.user.id },
    select: { provider: true, isEmailVerified: true, email: true, studentProfile: true },
  });
  check('new student is marked as a Google account', storedStudent?.provider === 'google');
  check('new student is already verified', storedStudent?.isEmailVerified === true);
  check('new student keeps the Google email', storedStudent?.email === studentProfile.email);
  check('new student profile keeps the NUB ID', storedStudent?.studentProfile?.nubId === nubId);
  check(
    'new student profile keeps the department',
    storedStudent?.studentProfile?.department === 'CSE',
    storedStudent?.studentProfile?.department
  );

  const again = await upsertGoogleUser(studentProfile, 'STUDENT');
  check(
    'repeat sign-in reuses the account',
    again.isNewUser === false && again.user.id === first.user.id
  );

  const employer = await upsertGoogleUser(profile(), 'EMPLOYER', { companyName: 'Acme Ltd' });
  createdUserIds.push(employer.user.id);
  const storedEmployer = await prisma.user.findUnique({
    where: { id: employer.user.id },
    select: { employerProfile: true },
  });
  check(
    'new employer gets the company name',
    storedEmployer?.employerProfile?.companyName === 'Acme Ltd',
    storedEmployer?.employerProfile?.companyName
  );

  // Duplicate NUB ID must not block sign-in.
  const clash = await upsertGoogleUser(profile(), 'STUDENT', { nubId, department: 'BBA' });
  createdUserIds.push(clash.user.id);
  const storedClash = await prisma.user.findUnique({
    where: { id: clash.user.id },
    select: { studentProfile: true },
  });
  check('duplicate NUB ID still signs the student in', clash.isNewUser === true);
  check(
    'duplicate NUB ID is dropped, not stored twice',
    storedClash?.studentProfile?.nubId == null,
    storedClash?.studentProfile?.nubId
  );

  // Linking an existing password account by email.
  const linkEmail = `nubjobs.gtest.link.${runId}@gmail.com`;
  const existing = await prisma.user.create({
    data: {
      email: linkEmail,
      name: 'Existing Password User',
      password: await hashPassword('Password123!'),
      role: 'STUDENT',
      isEmailVerified: true,
      studentProfile: { create: { nubId: `${nubId}L` } },
    },
    select: { id: true },
  });
  createdUserIds.push(existing.id);
  const linkGoogleId = `gt-link-${runId}`;
  const linked = await upsertGoogleUser(
    profile({ googleId: linkGoogleId, email: linkEmail, name: 'Renamed By Google' }),
    'STUDENT'
  );
  check('an existing email account is linked, not duplicated', linked.user.id === existing.id);
  const storedLinked = await prisma.user.findUnique({
    where: { id: existing.id },
    select: { googleId: true, name: true },
  });
  check('linking stores the Google id', storedLinked?.googleId === linkGoogleId, storedLinked?.googleId);
  check('linking refreshes the display name', storedLinked?.name === 'Renamed By Google', storedLinked?.name);

  // ── 4. The token pair issued by the callback must work ─────────────────────
  const token = generateAccessToken({
    userId: first.user.id,
    email: first.user.email,
    role: first.user.role,
  });
  const decoded = verifyAccessToken(token);
  check('issued access token verifies', decoded?.userId === first.user.id, decoded?.userId);

  // ── cleanup ────────────────────────────────────────────────────────────────
  const deleted = await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  check('test accounts cleaned up', deleted.count === createdUserIds.length, deleted.count);
  const leftovers = await prisma.user.count({ where: { id: { in: createdUserIds } } });
  check('no test accounts left behind', leftovers === 0, leftovers);

  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error('\nSmoke test crashed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
