'use client';

import { type FC, useState } from 'react';
import Link from 'next/link';
import { useCloseJob, useDeleteJobPosting, useEmployerJobs, useUpdateJobStatus } from '@/hooks/useEmployer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { MoreVertical, Plus } from 'lucide-react';
import { getErrorMessage } from '@/lib/utils';

const STATUS_FILTERS = ['ALL', 'DRAFT', 'PENDING', 'ACTIVE', 'CLOSED'] as const;
const PAGE_SIZE = 20;

/**
 * The employer's job table (status + sort filters, pagination, per-job action
 * menu) used by `/employer/jobs` and the Jobs tab of `/employer/company`.
 *
 * The list is scoped server-side to the signed-in employer
 * (`WHERE employerId = currentEmployer.id`), so it can never show another
 * company's postings.
 */
export const EmployerJobsPanel: FC<{ showCreateButton?: boolean }> = ({
  showCreateButton = true,
}) => {
  const [status, setStatus] = useState<string>('ALL');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'applicants' | 'views'>('newest');
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useEmployerJobs({ status, sort, page, limit: PAGE_SIZE });
  const closeJob = useCloseJob();
  const statusMutation = useUpdateJobStatus();
  const deleteMutation = useDeleteJobPosting();

  const jobs = data?.data ?? [];
  const pagination = data?.pagination;

  const handleClose = async (id: string) => {
    try {
      await closeJob.mutateAsync(id);
      toast.success('Job closed');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to close job'));
    }
  };

  const handleFeature = async (id: string, featured: boolean) => {
    try {
      await statusMutation.mutateAsync({ id, action: featured ? 'unfeature' : 'feature' });
      toast.success(featured ? 'Job unfeatured' : 'Job featured');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update the job'));
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast.success('Job deleted');
      setDeleteId(null);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Only draft jobs can be deleted'));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((option) => (
          <Button
            key={option}
            size="sm"
            variant={status === option ? 'default' : 'outline'}
            onClick={() => {
              setStatus(option);
              setPage(1);
            }}
          >
            {option === 'ALL' ? 'All' : option.charAt(0) + option.slice(1).toLowerCase()}
          </Button>
        ))}

        <select
          className="ml-auto rounded-md border bg-background px-2 py-1.5 text-sm"
          value={sort}
          onChange={(event) => {
            setSort(event.target.value as 'newest' | 'oldest' | 'applicants' | 'views');
            setPage(1);
          }}
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="applicants">Most applicants</option>
          <option value="views">Most views</option>
        </select>

        {showCreateButton && (
          <Button asChild size="sm">
            <Link href="/employer/post-job">
              <Plus className="size-4" />
              Post New Job
            </Link>
          </Button>
        )}
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Loading jobs…</p>
        ) : jobs.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            No jobs yet.{' '}
            <Link href="/employer/post-job" className="text-primary hover:underline">
              Post your first job
            </Link>
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Job Title</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Applicants</th>
                  <th className="px-4 py-3 font-medium">Views</th>
                  <th className="px-4 py-3 font-medium">Posted Date</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job: any) => (
                  <tr key={job.id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <Link href={`/employer/jobs/${job.id}`} className="font-medium hover:underline">
                        {job.title}
                      </Link>
                      {job.featured ? <span className="ml-1 text-amber-600">⭐</span> : null}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="px-4 py-3">
                      {job._count?.applications ?? 0}
                      {Array.isArray(job.topApplicants) && job.topApplicants.length > 0
                        ? ` · top ${job.topApplicants[0].matchScore}%`
                        : ''}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{job.views ?? 0}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(job.postedAt ?? job.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon-sm" variant="ghost" aria-label="Job actions">
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/employer/jobs/${job.id}`}>View Job Detail</Link>
                          </DropdownMenuItem>
                          {job.status === 'ACTIVE' && (
                            <DropdownMenuItem asChild>
                              <Link href={`/employer/applications?jobId=${job.id}`}>
                                View Applications
                              </Link>
                            </DropdownMenuItem>
                          )}
                          {['DRAFT', 'PENDING'].includes(job.status) && (
                            <DropdownMenuItem asChild>
                              <Link href={`/employer/post-job?edit=${job.id}`}>Edit Job</Link>
                            </DropdownMenuItem>
                          )}
                          {job.status === 'ACTIVE' && (
                            <DropdownMenuItem onSelect={() => void handleClose(job.id)}>
                              Close Job
                            </DropdownMenuItem>
                          )}
                          {job.status === 'ACTIVE' && (
                            <DropdownMenuItem
                              onSelect={() => void handleFeature(job.id, Boolean(job.featured))}
                            >
                              {job.featured ? 'Unfeature Job' : 'Feature Job'}
                            </DropdownMenuItem>
                          )}
                          {job.status === 'DRAFT' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                onSelect={() => setDeleteId(job.id)}
                              >
                                Delete Job
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-center gap-3 border-t p-4">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {pagination.page} of {pagination.pages} · {pagination.total} jobs
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= pagination.pages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </Card>

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this job?</AlertDialogTitle>
            <AlertDialogDescription>
              Only draft postings can be deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => void handleDelete()} className="bg-red-600 hover:bg-red-700">
            Delete
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EmployerJobsPanel;
