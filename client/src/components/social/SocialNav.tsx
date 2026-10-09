'use client';

/**
 * Page header for social routes (title + subtitle only).
 * Navigation lives in the SocialSidebar — the old horizontal tab bar
 * was removed because it duplicated the sidebar links below the title.
 */
export function SocialNav({ title, subtitle }: { title?: string; subtitle?: string }) {
  if (!title && !subtitle) return null;
  return (
    <div className="mb-6">
      {title && <h1 className="font-heading text-2xl font-bold text-foreground">{title}</h1>}
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

/** Two-column social layout: main column + right rail (trending/suggestions). */
export function SocialShell({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0">{children}</div>
      {right && <aside className="hidden min-w-0 space-y-4 lg:block">{right}</aside>}
    </div>
  );
}
