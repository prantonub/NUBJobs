'use client';

import { type FC, useState } from 'react';
import Link from 'next/link';
import { useCloseJob, useDeleteJobPosting, useUpdateJobStatus } from '@/hooks/useEmployer';
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
import { Eye, MoreVertical, Users } from 'lucide-react';
import { getErrorMessage } from '@/lib/utils';

export interface EmployerJobRow {
  id: string;
  title: string;
  status: string;
  views?: number;
  featured?: boolean;
  location?: string | null;
  type?: string | null;
  createdAt?: string;
  postedAt?: string;
  _count?: { applications: number };
  topApplicants?: Array<{ id: string; matchScore: number; status: string }>;
  applications?: Array<{ id: string; matchScore: number; status: string }>;
}

/**
 * Compact posting card with the full action menu. Self-contained: close,
 * feature/unfeature and delete run through the employer hooks, which are
 * scoped server-side to the signed-in employer's own jobs.
 */
export const EmployerJobCard: FC<{ job: EmployerJobRow; className?: string }> = ({
  job,
  className,
}) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const closeJob = useCloseJob();
  const statusMutation = useUpdateJobStatus();
  const deleteMutation = useDeleteJobPosting();

  const applicants = job._count?.applications ?? job.applications?.length ?? 0;
  const topMatch = (job.topApplicants ?? job.applications ?? [])[0]?.matchScore;
  const postedAt = job.postedAt ?? job.createdAt;

  const handleClose = async () => {
    try {
      await closeJob.mutateAsync(job.id);
      toast.success('Job closed');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to close job'));
    }
  };

  const handleFeature = async () => {
    try {
      await statusMutation.mutateAsync({ id: job.id, action: job.featured ? 'unfeature' : 'feature' });
      toast.success(job.featured ? 'Job unfeatured' : 'Job featured');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update the job'));
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(job.id);
      toast.success('Job deleted');
      setConfirmDelete(false);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Only draft jobs can be deleted'));
    }
  };

  return (
    <Card className={className ?? 'p-4'}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/employer/jobs/${job.id}`} className="font-medium hover:underline">
            {job.title}
          </Link>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {[job.location, job.type?.replace('_', ' ')].filter(Boolean).join(' · ') || 'No location set'}
            {postedAt ? ` · posted ${new Date(postedAt).toLocaleDateString()}` : ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge status={job.status} />
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
                  <Link href={`/employer/applications?jobId=${job.id}`}>View Applications</Link>
                </DropdownMenuItem>
              )}
              {['DRAFT', 'PENDING'].includes(job.status) && (
                <DropdownMenuItem asChild>
                  <Link href={`/employer/post-job?edit=${job.id}`}>Edit Job</Link>
                </DropdownMenuItem>
              )}
              {job.status === 'ACTIVE' && (
                <DropdownMenuItem onSelect={() => void handleClose()}>Close Job</DropdownMenuItem>
              )}
              {job.status === 'ACTIVE' && (
                <DropdownMenuItem onSelect={() => void handleFeature()}>
                  {job.featured ? 'Unfeature Job' : 'Feature Job'}
                </DropdownMenuItem>
              )}
              {job.status === 'DRAFT' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
                    Delete Job
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Users className="size-3.5" />
          {applicants} applicants
        </span>
        <span className="inline-flex items-center gap-1">
          <Eye className="size-3.5" />
          {job.views ?? 0} views
        </span>
        {typeof topMatch === 'number' && <span>top match {topMatch}%</span>}
        {job.featured && <span className="text-amber-600">⭐ featured</span>}
      </div>

      <div className="mt-3 flex gap-2">
        <Button asChild size="sm" variant="outline" className="flex-1">
          <Link href={`/employer/jobs/${job.id}`}>Details</Link>
        </Button>
        {job.status === 'ACTIVE' && (
          <Button asChild size="sm" className="flex-1">
            <Link href={`/employer/applications?jobId=${job.id}`}>Applicants</Link>
          </Button>
        )}
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
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
    </Card>
  );
};

export default EmployerJobCard;
