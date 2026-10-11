'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * /employer/messages — merged into the unified inbox at /messages.
 * Client-side redirect (the parent /employer layout is a client component,
 * so a server redirect() would never run here). Preserves ?user= / ?app=
 * so a deep link still opens the right thread; users see exactly one URL
 * (http://localhost:3000/messages?user=...) and one UI.
 */
export default function EmployerMessagesRedirect() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          Opening messages…
        </div>
      }
    >
      <RedirectWithParams />
    </Suspense>
  );
}

function RedirectWithParams() {
  const router = useRouter();
  const searchParams = useSearchParams();
  useEffect(() => {
    const qs = searchParams.toString();
    router.replace(qs ? `/messages?${qs}` : '/messages');
  }, [router, searchParams]);
  return null;
}
