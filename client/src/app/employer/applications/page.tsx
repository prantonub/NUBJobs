'use client';

import { type FC, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { EmployerApplicationsPanel } from '@/components/employer/EmployerApplicationsPanel';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

/**
 * /employer/applications — every applicant across the employer's OWN jobs.
 * `?jobId=` pre-filters to one posting (used by the jobs table/detail pages).
 */
const EmployerApplicationsPage: FC = () => {
  const searchParams = useSearchParams();
  const jobId = searchParams.get('jobId') ?? '';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Applications</h1>
          <p className="text-sm text-muted-foreground">
            Only applicants for your company&apos;s postings are shown.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/employer/jobs">My Jobs</Link>
          </Button>
          <Button asChild>
            <Link href="/employer/post-job">
              <Plus className="size-4" />
              Post New Job
            </Link>
          </Button>
        </div>
      </div>

      <EmployerApplicationsPanel initialJobId={jobId} />
    </div>
  );
};

const EmployerApplicationsPageWithParams: FC = () => (
  <Suspense
    fallback={<p className="p-8 text-center text-sm text-muted-foreground">Loading applications…</p>}
  >
    <EmployerApplicationsPage />
  </Suspense>
);

export default EmployerApplicationsPageWithParams;
