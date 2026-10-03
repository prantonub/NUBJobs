"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircleIcon, Loader2Icon } from "lucide-react";

import { authApi } from "@/lib/api/auth.api";
import { setAuthToken, setRefreshToken, clearAuthToken } from "@/lib/axios";
import { Button } from "@/components/ui/button";

/**
 * Landing spot for the Google OAuth round-trip.
 *
 * The API redirects here with `?accessToken=…&refreshToken=…&role=…&isNew=…`.
 * We persist the tokens (so every existing auth consumer picks them up via the
 * shared `AUTH_EVENT`), verify the session with `/auth/me`, then scrub the
 * tokens out of the address bar before sending the user to their dashboard.
 *
 * Using the real user record (rather than the `role` query param) to decide the
 * destination means an existing account always lands on the page that matches
 * the role actually stored on the server.
 */
function GoogleCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const accessToken = searchParams.get("accessToken");
    const refreshToken = searchParams.get("refreshToken");
    const isNewUser = searchParams.get("isNew") === "true";

    // Tokens travel in the query string, so remove them from the URL/history
    // immediately — even before the session check resolves.
    const scrubbedUrl = window.location.pathname;
    window.history.replaceState(null, "", scrubbedUrl);

    if (!accessToken) {
      setError("We couldn't complete Google sign-in. Please try again.");
      return;
    }

    let cancelled = false;
    setAuthToken(accessToken);
    if (refreshToken) setRefreshToken(refreshToken);

    authApi
      .me()
      .then(({ data }) => {
        if (cancelled) return;
        const user = data?.data?.user ?? data?.user;
        if (!user) throw new Error("No user in response");
        if (user.role === "ADMIN") router.replace("/admin");
        else router.replace("/dashboard");
      })
      .catch(() => {
        if (cancelled) return;
        clearAuthToken();
        setError(
          "We couldn't verify your Google session. Please try signing in again."
        );
      });

    return () => {
      cancelled = true;
    };
    // `isNewUser` only affects nothing here beyond being parsed for parity.
  }, [router, searchParams]);

  if (error) {
    return (
      <div className="text-center">
        <div
          role="alert"
          className="mb-5 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-left text-sm text-destructive"
        >
          <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.replace("/login")}
          className="h-11 w-full"
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
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-6 text-center">
      <Loader2Icon className="size-6 animate-spin text-brand-600" />
      <div>
        <h1 className="font-heading text-xl font-bold tracking-tight text-foreground">
          Signing you in
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Finishing Google sign-in — you&apos;ll be redirected in a moment.
        </p>
      </div>
    </div>
  );
}

export default function GoogleCallbackPage() {
  // `useSearchParams` requires a Suspense boundary during prerendering.
  return (
    <React.Suspense
      fallback={
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <Loader2Icon className="size-6 animate-spin text-brand-600" />
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      }
    >
      <GoogleCallbackInner />
    </React.Suspense>
  );
}
