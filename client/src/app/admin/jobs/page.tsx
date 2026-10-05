"use client";

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAdminJobs, useApproveJob, useRejectJob, useFeatureJob } from '@/hooks/useAdmin';
import { getErrorMessage } from '@/lib/utils';

export default function AdminJobsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const { data, isLoading, refetch } = useAdminJobs({
    search: search || undefined,
    status: status === 'ALL' ? undefined : status,
    page,
    limit: 20,
  });
  const approveJob = useApproveJob();
  const rejectJob = useRejectJob();
  const featureJob = useFeatureJob();
  const jobs = data?.jobs ?? [];
  const totalPages = data?.totalPages ?? 1;

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      toast.success(ok);
      refetch();
    } catch (e) {
      toast.error(getErrorMessage(e, 'Action failed'));
    }
  };

  return (
    <Card className="p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Job Approvals & Management</h2>
          <p className="text-sm text-muted-foreground">Review pending postings, feature jobs, or remove violations.</p>
        </div>
        <div className="flex items-center gap-2">
          <Input placeholder="Search jobs..." className="w-52" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          <select className="rounded-md border px-3 py-2 text-sm" aria-label="Filter by status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="ALL">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="ACTIVE">Active</option>
            <option value="DRAFT">Draft</option>
            <option value="CLOSED">Closed</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <p className="text-muted-foreground">Loading jobs...</p>
        ) : jobs.length === 0 ? (
          <p className="text-muted-foreground">No jobs to show.</p>
        ) : jobs.map((job: any) => (
          <div
            key={job.id}
            className={`flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between ${job.status === 'PENDING' ? 'border-amber-300 bg-amber-50/50 dark:bg-amber-950/10' : ''}`}
          >
            <div>
              <p className="font-semibold">
                <Link className="hover:underline" href={`/admin/jobs/${job.id}`}>{job.title}</Link>
                {job.featured && <span className="ml-2 text-xs font-medium text-amber-600">Featured</span>}
              </p>
              <p className="text-sm text-muted-foreground">
                {job.employer} · {job.applicants ?? 0} applicants · {job.views ?? 0} views
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={job.status === 'ACTIVE' ? 'outline' : job.status === 'PENDING' ? 'secondary' : 'destructive'}>{job.status}</Badge>
              <Button variant="outline" size="sm" onClick={() => act(() => approveJob.mutateAsync({ id: job.id }), 'Job approved')}>Approve</Button>
              <Button
                variant="secondary" size="sm"
                onClick={() => {
                  const reason = prompt('Rejection reason (required):');
                  if (!reason?.trim()) return;
                  act(() => rejectJob.mutateAsync({ id: job.id, reason }), 'Job rejected');
                }}
              >
                Reject
              </Button>
              <Button variant="ghost" size="sm" onClick={() => act(() => featureJob.mutateAsync({ id: job.id }), 'Feature toggled')}>
                {job.featured ? 'Unfeature' : 'Feature'}
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
        <span>Total: {data?.total ?? jobs.length}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
          <span className="px-2 py-1">Page {page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      </div>
    </Card>
  );
}
