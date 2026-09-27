'use client';

import { FC, useState } from 'react';
import Link from 'next/link';
import { useEmployerApplicationsList } from '@/hooks/useEmployer';
import { useEmployerJobs } from '@/hooks/useEmployer';
import { useApplicationRealtime } from '@/hooks/useApplicationRealtime';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ApplicationStatusBadge, type ApplicationStatus } from '@/components/ui/ApplicationStatusBadge';
import { Progress } from '@/components/ui/progress';
import { LayoutGrid, Loader2, MessageSquare, Rows3, Eye } from 'lucide-react';

const STATUSES = ['ALL', 'APPLIED', 'REVIEWED', 'SHORTLISTED', 'INTERVIEWED', 'HIRED', 'REJECTED'] as const;

/**
 * /employer/applications — every application across the company's jobs with
 * job/status filters, sorting, pagination and a table ↔ card view toggle.
 */
const EmployerApplicationsPage: FC = () => {
  const [status, setStatus] = useState<string>('ALL');
  const [jobId, setJobId] = useState<string>('');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'match'>('newest');
  const [page, setPage] = useState(1);
  const [view, setView] = useState<'table' | 'cards'>('table');

  useApplicationRealtime('EMPLOYER');

  const { data: jobsData } = useEmployerJobs();
  const { data, isLoading, isFetching } = useEmployerApplicationsList({
    status,
    jobId: jobId || undefined,
    sort,
    page,
    limit: 20,
  });

  const rows = data?.data ?? [];
  const stats = data?.stats ?? {};
  const pagination = data?.pagination;
  const jobs = jobsData?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Applications</h1>
          <p className="text-sm text-muted-foreground">
            {stats.total ?? 0} total · {stats.APPLIED ?? 0} new · {stats.SHORTLISTED ?? 0} shortlisted ·{' '}
            {stats.HIRED ?? 0} hired
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/employer/pipeline">Pipeline view</Link>
          </Button>
          <Button asChild>
            <Link href="/employer/post-job">Post New Job</Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {STATUSES.map((option) => (
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

        <div className="ml-auto flex flex-wrap items-center gap-2 text-sm">
          <select
            className="rounded-md border bg-background px-2 py-1.5"
            value={jobId}
            onChange={(event) => {
              setJobId(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All jobs</option>
            {jobs.map((job: { id: string; title: string }) => (
              <option key={job.id} value={job.id}>
                {job.title}
              </option>
            ))}
          </select>

          <select
            className="rounded-md border bg-background px-2 py-1.5"
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

          <Button
            size="icon-sm"
            variant="outline"
            onClick={() => setView(view === 'table' ? 'cards' : 'table')}
            aria-label="Toggle view"
          >
            {view === 'table' ? <LayoutGrid className="size-4" /> : <Rows3 className="size-4" />}
          </Button>

          {isFetching && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        </div>
      </div>

      {isLoading ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Loading applications…</Card>
      ) : rows.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No applications match these filters yet.
        </Card>
      ) : view === 'table' ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Student Name</th>
                  <th className="px-4 py-3 font-medium">Job Title</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Match %</th>
                  <th className="px-4 py-3 font-medium">Applied Date</th>
                  <th className="px-4 py-3 font-medium">Last Message</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((application: any) => (
                  <tr key={application.id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="px-4 py-3 font-medium">{application.student?.user?.name}</td>
                    <td className="px-4 py-3">{application.job?.title}</td>
                    <td className="px-4 py-3">
                      <ApplicationStatusBadge status={application.status as ApplicationStatus} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Progress value={application.matchScore} className="w-16" />
                        <span className="text-xs font-medium">{application.matchScore}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(application.appliedAt ?? application.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {application.lastMessage
                        ? new Date(application.lastMessage.createdAt).toLocaleDateString()
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button asChild size="sm" variant="ghost">
                          <Link href={`/employer/applications/${application.id}`}>
                            <Eye className="size-3.5" />
                            View
                          </Link>
                        </Button>
                        <Button asChild size="sm" variant="ghost">
                          <Link href={`/employer/applications/${application.id}#messages`}>
                            <MessageSquare className="size-3.5" />
                            Message
                          </Link>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((application: any) => (
            <Card key={application.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{application.student?.user?.name}</p>
                  <p className="text-xs text-muted-foreground">{application.job?.title}</p>
                </div>
                <ApplicationStatusBadge status={application.status as ApplicationStatus} />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Progress value={application.matchScore} className="flex-1" />
                <span className="text-xs font-medium">{application.matchScore}%</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                CGPA {application.student?.cgpa ?? '—'} ·{' '}
                {(application.student?.skills ?? []).slice(0, 3).join(', ') || 'No skills listed'}
              </p>
              <div className="mt-3 flex gap-2">
                <Button asChild size="sm" variant="outline" className="flex-1">
                  <Link href={`/employer/applications/${application.id}`}>View</Link>
                </Button>
                <Button asChild size="sm" variant="ghost">
                  <Link href={`/employer/applications/${application.id}#messages`}>
                    <MessageSquare className="size-3.5" />
                  </Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.pages}
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
    </div>
  );
};

export default EmployerApplicationsPage;
