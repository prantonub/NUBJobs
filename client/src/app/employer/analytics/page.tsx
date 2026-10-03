'use client';

import type { FC } from 'react';
import Link from 'next/link';
import { EmployerAnalyticsPanel } from '@/components/employer/EmployerAnalyticsPanel';
import { Button } from '@/components/ui/button';

/**
 * /employer/analytics — charts, metrics and per-job performance for the
 * company (the same panel is embedded in the Analytics tab of /employer/company).
 */
const EmployerAnalyticsPage: FC = () => (
  <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Hiring performance for your company over the last 6 months.
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" asChild>
          <Link href="/employer/company">Company profile</Link>
        </Button>
        <Button asChild>
          <Link href="/employer/post-job">Post New Job</Link>
        </Button>
      </div>
    </div>

    <EmployerAnalyticsPanel />
  </div>
);

export default EmployerAnalyticsPage;

