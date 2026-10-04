'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { BadgeCheckIcon } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { employerNav } from '@/components/employer/employer-nav';
import { RequireAuth } from '@/lib/middleware';
import { useCompanyProfile } from '@/hooks/useEmployer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';

/** Company identity block pinned to the top of the employer sidebar. */
function CompanySidebarBlock() {
  const { data: company } = useCompanyProfile();
  const name = company?.companyName ?? 'Your company';

  return (
    <Link
      href="/employer/company"
      className="flex items-center gap-3 border-b border-border px-4 py-3 transition-colors hover:bg-muted/50"
    >
      <Avatar size="sm">
        {company?.logoUrl ? <AvatarImage src={company.logoUrl} alt={name} /> : null}
        <AvatarFallback>{getInitials(name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{name}</p>
        <p className="truncate text-xs text-muted-foreground">Employer workspace</p>
      </div>
      {company?.isVerified ? (
        <BadgeCheckIcon className="size-4 shrink-0 text-emerald-500" aria-label="Verified company" />
      ) : null}
    </Link>
  );
}

/**
 * /employer/* shell — spec rule: ONLY EMPLOYER accounts may enter these
 * routes (RequireAuth redirects students/admins). Every API call underneath
 * is additionally scoped to the signed-in company's `employerId`, so no other
 * company's data can ever appear here.
 */
export default function EmployerLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth allowedRoles={['EMPLOYER']}>
      <DashboardLayout nav={employerNav} sidebarTop={<CompanySidebarBlock />}>
        {children}
      </DashboardLayout>
    </RequireAuth>
  );
}
