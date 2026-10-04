import 'dotenv/config';

/**
 * Live HTTP smoke test for the Google OAuth endpoints. Requires the API server
 * to be running (npm run dev). It never talks to Google: it only checks the
 * URLs and redirects our own routes produce.
 *
 * Run: cd server && npm run test:google-oauth:http
 */
const BASE = process.env.API_BASE_URL || 'http://localhost:5000';

let passed = 0;
let failed = 0;
let skipped = 0;

function check(name: string, condition: boolean, detail?: unknown) {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${name}${detail !== undefined ? ` -> ${JSON.stringify(detail)}` : ''}`);
  }
}

/** Follows nothing: returns the raw status + Location header. */
async function probe(url: string) {
  const response = await fetch(url, { redirect: 'manual' });
  return { status: response.status, location: response.headers.get('location') || '' };
}

function decodeState(state: string) {
  return JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
}

async function main() {
  console.log('\nGoogle OAuth live HTTP smoke test\n');

  const health = await fetch(`${BASE}/health`).catch(() => null);
  if (!health || !health.ok) {
    console.log(`  SKIP  server not reachable at ${BASE} — start it with "npm run dev"\n`);
    skipped += 1;
    process.exitCode = 1;
    return;
  }
  check('server is healthy', health.ok);

  // ── 1. /api/auth/google (json mode) ───────────────────────────────────────
  const jsonUrl =
    `${BASE}/api/auth/google?json=1&intent=signup&role=EMPLOYER&companyName=Acme%20Ltd`;
  const jsonResponse = await fetch(jsonUrl);
  const payload: any = await jsonResponse.json();
  const consent = new URL(payload?.data?.url || 'http://invalid');
  const query = consent.searchParams;

  check('json mode returns 200', jsonResponse.status === 200, jsonResponse.status);
  check('json mode returns success', payload?.success === true, payload?.success);
  check('consent URL points at Google', consent.hostname === 'accounts.google.com', consent.hostname);
  check('consent URL hits the consent screen', consent.pathname === '/o/oauth2/v2/auth', consent.pathname);
  check(
    'consent URL carries the configured client id',
    query.get('client_id') === (process.env.GOOGLE_CLIENT_ID || '').trim(),
    query.get('client_id')
  );
  check(
    'consent URL carries the configured callback',
    query.get('redirect_uri') === process.env.GOOGLE_CALLBACK_URL,
    query.get('redirect_uri')
  );
  check('consent URL uses the authorization code flow', query.get('response_type') === 'code', query.get('response_type'));
  check('consent URL requests openid/email/profile', query.get('scope') === 'openid email profile', query.get('scope') === 'openid email profile');
  check('consent URL returns the state', !!payload?.data?.state);

  // ── 2. the state carries intent + role + extras ───────────────────────────
  const decoded = decodeState(payload.data.state);
  check('state carries the role (EMPLOYER)', decoded.role === 'EMPLOYER', decoded.role);
  check('state carries the intent (signup)', decoded.intent === 'signup', decoded.intent);
  check(
    'state carries the company name',
    decoded.companyName === 'Acme Ltd',
    decoded.companyName
  );

  // ── 3. browser mode must redirect to Google ───────────────────────────────
  const browser = await probe(`${BASE}/api/auth/google`);
  check('browser mode redirects', browser.status === 302, browser.status);
  check(
    'browser redirect goes to Google',
    browser.location.startsWith('https://accounts.google.com/o/oauth2/v2/auth'),
    browser.location.slice(0, 80)
  );

  // ── 4. consent cancelled / failed ─────────────────────────────────────────
  const signupState = Buffer.from(
    JSON.stringify({ role: 'STUDENT', intent: 'signup', nonce: 'x' })
  ).toString('base64url');
  const cancelled = await probe(
    `${BASE}/api/auth/google/callback?error=access_denied&state=${signupState}`
  );
  check('cancelled consent redirects', cancelled.status === 302, cancelled.status);
  check(
    'cancelled signup lands on /register with an error',
    cancelled.location.includes('/register') &&
      cancelled.location.toLowerCase().includes('google'),
    cancelled.location
  );

  const cancelledLogin = await probe(
    `${BASE}/api/auth/google/callback?error=access_denied&state=${Buffer.from(
      JSON.stringify({ role: 'STUDENT', intent: 'login' })
    ).toString('base64url')}`
  );
  check(
    'cancelled login lands on /login with an error',
    cancelledLogin.location.includes('/login') &&
      cancelledLogin.location.toLowerCase().includes('google'),
    cancelledLogin.location
  );

  const noCode = await probe(`${BASE}/api/auth/google/callback`);
  check('missing code redirects with an error', noCode.status === 302 && noCode.location.includes('error='), noCode.location);

  const badState = await probe(`${BASE}/api/auth/google/callback?code=abc`);
  check('unparsable state still redirects safely', badState.status === 302 && badState.location.includes('/login'), badState.location);

  // ── 5. a bogus code must fail at Google, not crash the server ─────────────
  const bogus = await probe(`${BASE}/api/auth/google/callback?code=bogus-code-1234`);
  check('bogus code redirects instead of 500', bogus.status === 302, bogus.status);
  check(
    'bogus code redirects to a login error',
    bogus.location.includes('/login') && bogus.location.includes('error='),
    bogus.location
  );

  const stillAlive = await fetch(`${BASE}/health`).catch(() => null);
  check('server survived the failed exchange', !!stillAlive && stillAlive.ok);

  console.log(`\n${passed} passed, ${failed} failed, ${skipped} skipped\n`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error('\nHTTP smoke test crashed:', error);
  process.exitCode = 1;
});
