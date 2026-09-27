'use client';

import { FC, useState } from 'react';
import Link from 'next/link';
import { useCloseJob, useDeleteJob, useEmployerJobs, useUpdateJobStatus } from '@/hooks/useEmployer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

const statusClass = (status: string) => {
  switch (status) {
    case 'ACTIVE':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'PENDING':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'DRAFT':
      return 'border-slate-200 bg-slate-50 text-slate-700';
    default:
      return 'border-border bg-muted text-muted-foreground';
  }
};

/**
 * /employer/jobs — the employer's postings with applicant/views counts, status
 * and sort filters, and the full action menu (view, applicants, close, feature,
 * delete drafts).
 */
const EmployerJobsPage: FC = () => {
  const [status, setStatus] = useState<string>('ALL');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'applicants' | 'views'>('newest');
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useEmployerJobs(status, page, { sort, limit: 20 });
  const closeJob = useCloseJob();
  const statusMutation = useUpdateJobStatus();
  const deleteMutation = useDeleteJob();

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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">My Jobs</h1>
          <p className="text-sm text-muted-foreground">Manage postings, track applicants, close or feature listings.</p>
        </div>
        <Button asChild>
          <Link href="/employer/post-job">
            <Plus className="size-4" />
            Post New Job
          </Link>
        </Button>
      </div>

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
          className="ml-auto rounded-md border bg-background px-2 py-1.5"
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
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Applicants</th>
                  <th className="px-4 py-3 font-medium">Views</th>
                  <th className="px-4 py-3 font-medium">Posted</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job: any) => (
                  <tr key={job.id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="px-4 py-3 font-medium">
                      {job.title}
                      {job.featured ? ' ⭐' : ''}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={statusClass(job.status)}>
                        {job.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {job._count?.applications ?? 0}
                      {Array.isArray(job.applications) && job.applications.length > 0
                        ? ` · top ${job.applications[0].matchScore}%`
                        : ''}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{job.views ?? 0}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(job.createdAt).toLocaleDateString()}
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
                            <Link href={`/jobs/${job.id}`}>View Details</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/employer/applications?jobId=${job.id}`}>
                              View Applications
                            </Link>
                          </DropdownMenuItem>
                          {job.status === 'DRAFT' && (
                            <DropdownMenuItem asChild>
                              <Link href={`/employer/post-job?edit=${job.id}`}>Edit Job</Link>
                            </DropdownMenuItem>
                          )}
                          {job.status === 'ACTIVE' && (
                            <>
                              <DropdownMenuItem onSelect={() => void handleClose(job.id)}>
                                Close Job
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => void handleFeature(job.id, Boolean(job.featured))}
                              >
                                {job.featured ? 'Unfeature Job' : 'Feature Job'}
                              </DropdownMenuItem>
                            </>
                          )}
                          {job.status === 'DRAFT' && (
                            <DropdownMenuItem
                              variant="destructive"
                              onSelect={() => setDeleteId(job.id)}
                            >
                              Delete Job
                            </DropdownMenuItem>
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
              Page {pagination.page} of {pagination.pages}
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

export default EmployerJobsPage;
