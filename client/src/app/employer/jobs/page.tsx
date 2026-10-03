'use client';

import type { FC } from 'react';
import Link from 'next/link';
import { EmployerJobsPanel } from '@/components/employer/EmployerJobsPanel';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

/**
 * /employer/jobs — the employer's own postings (thin shell around
 * `EmployerJobsPanel`, which is also embedded in the Jobs tab of
 * /employer/company).
 */
const EmployerJobsPage: FC = () => (
  <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold">My Jobs</h1>
        <p className="text-sm text-muted-foreground">
          Only your company&apos;s postings are shown here — manage, close or feature them.
        </p>
      </div>
      <Button asChild>
        <Link href="/employer/post-job">
          <Plus className="size-4" />
          Post New Job
        </Link>
      </Button>
    </div>

    <EmployerJobsPanel showCreateButton={false} />
  </div>
);

export default EmployerJobsPage;
