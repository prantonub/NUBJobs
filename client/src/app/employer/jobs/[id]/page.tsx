'use client';

import type { FC } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  useCloseJob,
  useDeleteJobPosting,
  useEmployerJobDetail,
  useUpdateJobStatus,
} from '@/hooks/useEmployer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ApplicationStatusBadge, type ApplicationStatus } from '@/components/ui/ApplicationStatusBadge';
import { toast } from 'sonner';
import { ArrowLeft, Eye, Loader2, Users } from 'lucide-react';
import { getErrorMessage, formatSalary } from '@/lib/utils';

/**
 * /employer/jobs/[id] — full detail of ONE of the employer's own postings.
 * The API returns 403 for any other company's job, so a leaked id shows the
 * "not found / not yours" state instead of foreign data.
 */
const EmployerJobDetailPage: FC = () => {
  const params = useParams<{ id: string }>();
  const jobId = typeof params?.id === 'string' ? params.id : '';

  const { data: job, isLoading } = useEmployerJobDetail(jobId);
  const closeJob = useCloseJob();
  const statusMutation = useUpdateJobStatus();
  const deleteMutation = useDeleteJobPosting();

  if (isLoading) {
    return <p className="p-8 text-center text-sm text-muted-foreground">Loading job…</p>;
  }

  if (!job) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-muted-foreground">
          This job does not exist or does not belong to your company.
        </p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/employer/jobs">Back to my jobs</Link>
        </Button>
      </div>
    );
  }

  const applicants = job._count?.applications ?? job.topApplicants?.length ?? 0;
  const postedAt = job.postedAt ?? job.createdAt;

  const handleClose = async () => {
    try {
      await closeJob.mutateAsync(job.id);
      toast.success('Job closed');
    } catch (error) { toast.error(getErrorMessage(error, 'Failed to close job')); }
  };

  const handleFeature = async () => {
    try {
      await statusMutation.mutateAsync({ id: job.id, action: job.featured ? 'unfeature' : 'feature' });
      toast.success(job.featured ? 'Job unfeatured' : 'Job featured');
    } catch (error) { toast.error(getErrorMessage(error, 'Failed to update the job')); }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(job.id);
      toast.success('Job deleted');
      window.location.assign('/employer/jobs');
    } catch (error) { toast.error(getErrorMessage(error, 'Only draft jobs can be deleted')); }
  };

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/employer/jobs">
          <ArrowLeft className="size-4" />
          Back to my jobs
        </Link>
      </Button>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold">{job.title}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {job.location ? `${job.location} · ` : ''}
                  {job.type ? `${String(job.type).replace('_', ' ').toLowerCase()} · ` : ''}
                  {job.category ?? 'General'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Posted {postedAt ? new Date(postedAt).toLocaleString() : '—'}
                  {job.deadline ? ` · deadline ${new Date(job.deadline).toLocaleDateString()}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={job.status} />
                {job.featured ? <span className="text-amber-600">⭐ featured</span> : null}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Users className="size-4" />
                {applicants} applicants
              </span>
              <span className="inline-flex items-center gap-1">
                <Eye className="size-4" />
                {job.views ?? 0} views
              </span>
              <span>{formatSalary(job.salaryMin ?? undefined, job.salaryMax ?? undefined)} BDT</span>
              {job.minCgpa ? <span>Min CGPA {job.minCgpa}</span> : null}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="mb-3 font-semibold">Description</h2>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{job.description}</p>
          </Card>

          <Card className="p-6">
            <h2 className="mb-3 font-semibold">Requirements</h2>
            <ul className="space-y-2 text-sm">
              <li>
                <span className="text-muted-foreground">Salary range: </span>
                {formatSalary(job.salaryMin ?? undefined, job.salaryMax ?? undefined)} BDT
              </li>
              <li>
                <span className="text-muted-foreground">Minimum CGPA: </span>
                {job.minCgpa ?? 'Any'}
              </li>
              <li>
                <span className="text-muted-foreground">Target university: </span>
                {job.targetUniversity ?? 'ALL'}
              </li>
            </ul>
            <div className="mt-3 flex flex-wrap gap-1">
              {(job.skills ?? []).map((skill: string) => (
                <span key={skill} className="rounded-full bg-muted px-2 py-0.5 text-xs">
                  {skill}
                </span>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="mb-3 font-semibold">Application Pipeline</h2>
            <div className="flex flex-wrap gap-3 text-sm">
              {Object.entries(job.statusCounts ?? {}).length === 0 ? (
                <p className="text-muted-foreground">No applications yet.</p>
              ) : (
                Object.entries(job.statusCounts ?? {}).map(([status, count]) => (
                  <span key={status} className="inline-flex items-center gap-2">
                    <ApplicationStatusBadge status={status as ApplicationStatus} />
                    <span className="font-medium">{String(count)}</span>
                  </span>
                ))
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="mb-3 font-semibold">Actions</h2>
            <div className="space-y-2">
              <Button asChild className="w-full">
                <Link href={`/employer/applications?jobId=${job.id}`}>View All Applications</Link>
              </Button>
              {['DRAFT', 'PENDING'].includes(job.status) && (
                <Button asChild variant="outline" className="w-full">
                  <Link href={`/employer/post-job?edit=${job.id}`}>Edit Job</Link>
                </Button>
              )}
              {job.status === 'ACTIVE' && (
                <>
                  <Button variant="outline" className="w-full" onClick={() => void handleClose()}>
                    Close Job
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => void handleFeature()}>
                    {job.featured ? 'Unfeature Job' : 'Feature Job'}
                  </Button>
                </>
              )}
              {job.status === 'DRAFT' && (
                <Button variant="destructive" className="w-full" onClick={() => void handleDelete()}>
                  Delete Job
                </Button>
              )}
            </div>
            {statusMutation.isPending || closeJob.isPending || deleteMutation.isPending ? (
              <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3 animate-spin" />
                Applying change…
              </p>
            ) : null}
          </Card>

          <Card className="p-6">
            <h2 className="mb-3 font-semibold">Top Applicants</h2>
            {Array.isArray(job.topApplicants) && job.topApplicants.length > 0 ? (
              <ul className="space-y-2 text-sm">
                {job.topApplicants
                  .slice(0, 8)
                  .map(
                    (applicant: {
                      id: string;
                      matchScore: number;
                      status: string;
                      student?: { user?: { name?: string } };
                    }) => (
                      <li key={applicant.id} className="flex items-center justify-between gap-2">
                        <Link
                          href={`/employer/applications/${applicant.id}`}
                          className="truncate hover:underline"
                        >
                          {applicant.student?.user?.name ?? 'Candidate'}
                        </Link>
                        <span className="flex items-center gap-2 text-xs text-muted-foreground">
                          {applicant.matchScore}%
                          <ApplicationStatusBadge status={applicant.status as ApplicationStatus} />
                        </span>
                      </li>
                    )
                  )}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No applicants yet.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EmployerJobDetailPage;
