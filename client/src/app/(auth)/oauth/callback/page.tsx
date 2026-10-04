"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircleIcon, Loader2Icon } from "lucide-react";

import { authApi } from "@/lib/api/auth.api";
import { setAuthToken, setRefreshToken, clearAuthToken } from "@/lib/axios";
import { Button } from "@/components/ui/button";

/** Express API base URL â€” the same fallback the shared axios client uses. */
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

/** Where a fresh sign-in attempt starts. */
const GOOGLE_START_URL = `${API_BASE_URL}/auth/google?intent=login`;

/**
 * Landing spot for the Google OAuth round-trip.
 *
 * The API redirects here with `?accessToken=â€¦&refreshToken=â€¦&role=â€¦&isNew=â€¦`.
 * We persist the tokens (so every existing auth consumer picks them up via the
 * shared `AUTH_EVENT`), verify the session with `/auth/me`, then only replace
 * the address bar after this pass has a working token: the next effect run
 * uses the same request params and so cannot mistake consumption for a fresh
 * visit. Using the real user record (rather than the `role` query param) to
 * decide the destination means an existing account always lands on the page
 * that matches the role stored on the server.
 */

function GoogleCallbackInner() {
  const router = useRouter();
  // `useSearchParams` needs a Suspense boundary; inside it this hook reads the
  // request URL posted by the API instead of browser state that has already
  // been scrubbed. Unlike a `window.location.search` snapshot taken during SSR,
  // it cannot produce a server/client HTML mismatch.
  const searchParams = useSearchParams();
  const accessToken = searchParams.get("accessToken");
  const refreshToken = searchParams.get("refreshToken");
  const oauthErrorCode = searchParams.get("error");
  const oauthErrorDescription = searchParams.get("error_description");
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const [sessionError, setSessionError] = React.useState<string | null>(null);

  // Everything that can be decided from the query string alone is derived while
  // rendering, so the error shows immediately and the effect below stays free
  // of synchronous state updates.
  const googleError = oauthErrorCode
    ? oauthErrorCode === "access_denied"
      ? "Google sign-in was cancelled."
      : oauthErrorDescription || "Google sign-in failed. Please try again."
    : null;
  const missingDetails =
    !googleError && !accessToken && !code
      ? "We couldn't find the Google sign-in details in this link. Please start the sign-in again."
      : null;
  const error = googleError ?? missingDetails ?? sessionError;

  // The hand-off must only be applied once, even though React invokes effects
  // twice in development. Deliberately not a `cancelled` flag from a cleanup:
  // that would cancel the in-flight `/auth/me` call of the first pass and leave
  // the user stranded on this screen.
  const startedRef = React.useRef(false);

  React.useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    // Nothing to finish when Google reported a failure.
    if (googleError) return;

    // Google handed the authorization code to the SPA instead of the API, which
    // happens when the OAuth client's redirect URI points at the client. Hand
    // the untouched code back so the sign-in still completes.
    if (!accessToken && code) {
      const forwarded = new URLSearchParams({ code });
      if (state) forwarded.set("state", state);
      window.location.replace(
        `${API_BASE_URL}/auth/google/callback?${forwarded.toString()}`
      );
      return;
    }

    if (!accessToken) return;

    // Scrub the URL only after this pass has a working token: replacing the
    // location can rerender this effect in the same browser session, and the
    // next run must distinguish a consumed redirect from a direct visit.
    window.history.replaceState(null, "", window.location.pathname);

    setAuthToken(accessToken);
    if (refreshToken) setRefreshToken(refreshToken);

    authApi
      .me()
      .then(({ data }) => {
        const user = data?.data?.user ?? data?.user;
        if (!user) throw new Error("No user in response");
        if (user.role === "ADMIN") router.replace("/admin");
        // Spec: employers (new sign-ups included) land on their workspace.
        else if (user.role === "EMPLOYER") router.replace("/employer/dashboard");
        else router.replace("/dashboard");
      })
      .catch(() => {
        clearAuthToken();
        setSessionError(
          "We couldn't verify your Google session. Please sign in again."
        );
      });
  }, [accessToken, code, googleError, refreshToken, router, state]);

  const alert = error ? (
    <div className="text-center">
      <div
        role="alert"
        className="mb-5 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-left text-sm text-destructive"
      >
        <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
        <span>{error}</span>
      </div>
      {/* Restarting the flow is a full navigation to the API, not an internal
          Next.js route, so a plain anchor is the right element here. */}
      <Button asChild className="h-11 w-full">
        <a href={GOOGLE_START_URL}>Try Google again</a>
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => router.replace("/login")}
        className="mt-2 h-11 w-full"
      >
        Back to sign in
      </Button>
      <p className="mt-4 text-sm text-muted-foreground">
        Prefer email?{" "}
        <Link href="/login" className="font-medium text-brand-600 hover:underline">
          Sign in with a password
        </Link>
      </p>
    </div>
  ) : null;

  return (
    <>
      {alert}
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <Loader2Icon className="size-6 animate-spin text-brand-600" />
        <div>
          <h1 className="font-heading text-xl font-bold tracking-tight text-foreground">
            Signing you in
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Finishing Google sign-in â€” you&apos;ll be redirected in a moment.
          </p>
        </div>
      </div>
    </>
  );
}

// `useSearchParams` forces this client-only route to render inside Suspense;
// the fallback shows exactly the same loading screen as the inner component.
export default function GoogleCallbackPage() {
  return (
    <React.Suspense fallback={<GoogleCallbackLoading />}>
      <GoogleCallbackInner />
    </React.Suspense>
  );
}

function GoogleCallbackLoading() {
  return (
    <div className="flex flex-col items-center gap-4 py-6 text-center">
      <Loader2Icon className="size-6 animate-spin text-brand-600" />
      <div>
        <h1 className="font-heading text-xl font-bold tracking-tight text-foreground">
          Signing you in
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Finishing Google sign-in â€” you&apos;ll be redirected in a moment.
        </p>
      </div>
    </div>
  );
}

