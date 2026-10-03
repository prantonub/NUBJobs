'use client';

import { type FC, Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CompanyOverviewTab } from '@/components/employer/CompanyOverviewTab';
import { CompanySettingsTab } from '@/components/employer/CompanySettingsTab';
import { EmployerJobsPanel } from '@/components/employer/EmployerJobsPanel';
import { EmployerApplicationsPanel } from '@/components/employer/EmployerApplicationsPanel';
import { EmployerAnalyticsPanel } from '@/components/employer/EmployerAnalyticsPanel';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'jobs', label: 'Jobs' },
  { id: 'applications', label: 'Applications' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'settings', label: 'Settings' },
] as const;

type TabId = (typeof TABS)[number]['id'];

const isTabId = (value: string | null): value is TabId =>
  Boolean(value) && TABS.some((tab) => tab.id === value);

/**
 * /employer/company — the company hub: Overview, Jobs, Applications, Analytics
 * and Settings in one place (the same panels power the dedicated routes).
 * The active tab is kept in `?tab=` so links can deep-link into it.
 */
const CompanyHubPage: FC = () => {
  const searchParams = useSearchParams();
  const requested = searchParams.get('tab');
  const [tab, setTab] = useState<TabId>(isTabId(requested) ? requested : 'overview');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Company</h1>
        <p className="text-sm text-muted-foreground">
          Manage your profile, postings, applicants and hiring analytics.
        </p>
      </div>

      <nav className="flex flex-wrap gap-2 border-b pb-3">
        {TABS.map((entry) => (
          <Button
            key={entry.id}
            size="sm"
            variant={tab === entry.id ? 'default' : 'ghost'}
            className={cn(tab === entry.id && 'pointer-events-none')}
            onClick={() => setTab(entry.id)}
          >
            {entry.label}
          </Button>
        ))}
      </nav>

      {tab === 'overview' && <CompanyOverviewTab />}
      {tab === 'jobs' && <EmployerJobsPanel />}
      {tab === 'applications' && <EmployerApplicationsPanel />}
      {tab === 'analytics' && <EmployerAnalyticsPanel />}
      {tab === 'settings' && <CompanySettingsTab />}
    </div>
  );
};

const CompanyHubPageWithParams: FC = () => (
  // `useSearchParams` needs a Suspense boundary in the App Router.
  <Suspense fallback={<p className="p-8 text-center text-sm text-muted-foreground">Loading…</p>}>
    <CompanyHubPage />
  </Suspense>
);

export default CompanyHubPageWithParams;
