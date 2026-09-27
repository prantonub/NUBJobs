'use client';

import { FC, useState } from 'react';
import Link from 'next/link';
import {
  useApplications,
  useApplicationStats,
  useWithdrawApplication,
} from '@/hooks/useApplications';
import { useApplicationRealtime } from '@/hooks/useApplicationRealtime';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ApplicationStatusBadge, type ApplicationStatus } from '@/components/ui/ApplicationStatusBadge';
import { Progress } from '@/components/ui/progress';
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
import { Eye, Loader2, MessageSquare, Trash2 } from 'lucide-react';
import { getErrorMessage } from '@/lib/utils';

const STATUS_TABS = [
  'ALL',
  'APPLIED',
  'REVIEWED',
  'SHORTLISTED',
  'INTERVIEWED',
  'HIRED',
  'REJECTED',
  'WITHDRAWN',
] as const;

const PAGE_SIZE = 20;
const WITHDRAWABLE = (status: string) => !['HIRED', 'REJECTED', 'WITHDRAWN'].includes(status);

const ApplicationsPage: FC = () => {
  const [status, setStatus] = useState<string>('ALL');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'match'>('newest');
  const [page, setPage] = useState(1);
  const [withdrawId, setWithdrawId] = useState<string | null>(null);

  // Live updates: `application_status_changed` invalidates these queries.
  useApplicationRealtime('STUDENT');

  const { data, isLoading, isFetching } = useApplications({ status, sort, page, limit: PAGE_SIZE });
  const { data: stats } = useApplicationStats();
  const withdrawMutation = useWithdrawApplication();

  const rows = data?.data ?? [];
  const pagination = data?.pagination;

  const statCards = [
    { label: 'Total', value: stats?.total ?? 0 },
    { label: 'Pending', value: stats?.pending ?? 0 },
    { label: 'Shortlisted', value: stats?.shortlisted ?? 0 },
    { label: 'Interviewed', value: stats?.interviewed ?? 0 },
    { label: 'Hired', value: stats?.hired ?? 0 },
  ];

  const handleWithdraw = async () => {
    if (!withdrawId) return;
    try {
      await withdrawMutation.mutateAsync(withdrawId);
      toast.success('Application withdrawn');
      setWithdrawId(null);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to withdraw application'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">My Applications</h1>
          <p className="text-sm text-muted-foreground">
            Track every application, its match score and status in real time.
          </p>
        </div>
        <Button asChild>
          <Link href="/jobs">Browse jobs</Link>
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {statCards.map((card) => (
          <Card key={card.label} className="p-4">
            <p className="text-xs text-muted-foreground">{card.label}</p>
            <p className="mt-1 text-2xl font-bold">{card.value}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {STATUS_TABS.map((tab) => (
          <Button
            key={tab}
            size="sm"
            variant={status === tab ? 'default' : 'outline'}
            onClick={() => {
              setStatus(tab);
              setPage(1);
            }}
          >
            {tab === 'ALL' ? 'All' : tab.charAt(0) + tab.slice(1).toLowerCase()}
          </Button>
        ))}

        <label className="ml-auto flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Sort</span>
          <select
            className="rounded-md border bg-background px-2 py-1.5 text-sm"
            value={sort}
            onChange={(event) => {
              setSort(event.target.value as 'newest' | 'oldest' | 'match');
              setPage(1);
            }}
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="match">Match score</option>
          </select>
          {isFetching && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        </label>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Loading applications…</p>
        ) : rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            No applications found.{' '}
            <Link href="/jobs" className="text-primary hover:underline">
              Browse jobs
            </Link>
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Job Title</th>
                  <th className="px-4 py-3 font-medium">Company</th>
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 font-medium">Applied Date</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Match Score</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((application) => (
                  <tr key={application.id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="px-4 py-3 font-medium">{application.job?.title}</td>
                    <td className="px-4 py-3">{application.job?.employer?.companyName}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {application.job?.location ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(application.appliedAt ?? application.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <ApplicationStatusBadge status={application.status as ApplicationStatus} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Progress value={application.matchScore} className="w-16" />
                        <span className="text-xs font-medium">{application.matchScore}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button asChild size="sm" variant="ghost">
                          <Link href={`/dashboard/applications/${application.id}`}>
                            <Eye className="size-3.5" />
                            View
                          </Link>
                        </Button>
                        <Button asChild size="sm" variant="ghost">
                          <Link href={`/dashboard/applications/${application.id}#messages`}>
                            <MessageSquare className="size-3.5" />
                            Message
                          </Link>
                        </Button>
                        {WITHDRAWABLE(application.status) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setWithdrawId(application.id)}
                          >
                            <Trash2 className="size-3.5" />
                            Withdraw
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-center gap-3 border-t p-4">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {pagination.page} of {pagination.pages} · {pagination.total} applications
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= pagination.pages}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </Card>

      <AlertDialog open={Boolean(withdrawId)} onOpenChange={(open) => !open && setWithdrawId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Withdraw application</AlertDialogTitle>
            <AlertDialogDescription>
              This withdraws your application and notifies the employer. It cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => void handleWithdraw()}
            className="bg-red-600 hover:bg-red-700"
          >
            Withdraw
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

};

export default ApplicationsPage;

