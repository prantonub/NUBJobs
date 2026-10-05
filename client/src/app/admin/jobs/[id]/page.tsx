"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  useAdminJobDetail,
  useAdminRemoveJob,
  useAdminRequestChanges,
  useApproveJob,
  useFeatureJob,
  useRejectJob,
} from '@/hooks/useAdmin';
import { getErrorMessage } from '@/lib/utils';

const fmt = (v?: string | null) => (v ? new Date(v).toLocaleDateString() : '—');
const statusVariant = (s: string) =>
  s === 'ACTIVE' ? 'outline' : s === 'PENDING' ? 'secondary' : s === 'REJECTED' ? 'destructive' : 'secondary';

export default function AdminJobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: job, isLoading, refetch } = useAdminJobDetail(id);
  const approveJob = useApproveJob();
  const rejectJob = useRejectJob();
  const featureJob = useFeatureJob();
  const requestChanges = useAdminRequestChanges();
  const removeJob = useAdminRemoveJob();

  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');

  if (isLoading) {
    return <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">Loading job...</div>;
  }
  if (!job) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        Job not found. <Link className="underline" href="/admin/jobs">Back to jobs</Link>
      </div>
    );
  }

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      toast.success(ok);
      refetch();
    } catch (e) {
      toast.error(getErrorMessage(e, 'Action failed'));
    }
  };

  const skills: string[] = Array.isArray(job.skills) ? job.skills : [];
  const employer: any = job.employerInfo ?? job.employer ?? {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-2xl font-bold tracking-tight">{job.title}</h1>
              <Badge variant={statusVariant(job.status)}>{job.status}</Badge>
              {job.featured && <Badge variant="outline" className="text-amber-600">Featured</Badge>}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {employer.companyName} · posted {fmt(job.postedAt ?? job.createdAt)} ·{' '}
              {job.applicationsCount ?? job._count?.applications ?? 0} applicants · {job.views ?? 0} views
            </p>
            <p className="text-sm text-muted-foreground">
              <Link className="underline" href={`/jobs/${job.id}`}>View public listing</Link>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => run(() => featureJob.mutateAsync({ id: job.id }), 'Feature toggled')}>
              {job.featured ? 'Unfeature' : 'Feature'}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                const r = prompt('Reason for removing this job (violation):');
                if (!r?.trim()) return;
                run(() => removeJob.mutateAsync({ id: job.id, reason: r.trim() }), 'Job removed');
              }}
            >
              Remove job
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* Job info + description */}
        <Card className="xl:col-span-2">
          <CardHeader><CardTitle>Job details</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            <dl className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <div><dt className="text-muted-foreground">Category</dt><dd className="font-medium">{job.category ?? '—'}</dd></div>
              <div><dt className="text-muted-foreground">Type</dt><dd className="font-medium">{job.type ?? '—'}</dd></div>
              <div><dt className="text-muted-foreground">Location</dt><dd className="font-medium">{job.location ?? '—'}</dd></div>
              <div><dt className="text-muted-foreground">Salary</dt>
                <dd className="font-medium">{job.salaryMin ? `${job.salaryMin}` : '—'}{job.salaryMax ? ` – ${job.salaryMax}` : ''}</dd>
              </div>
              <div><dt className="text-muted-foreground">Min CGPA</dt><dd className="font-medium">{job.minCgpa ?? '—'}</dd></div>
              <div><dt className="text-muted-foreground">Deadline</dt><dd className="font-medium">{fmt(job.deadline)}</dd></div>
            </dl>
            <div className="flex flex-wrap gap-1">
              {skills.length ? skills.map((s) => <Badge key={s} variant="secondary">{s}</Badge>) : <span className="text-muted-foreground">No skills listed</span>}
            </div>
            <div>
              <p className="mb-1 font-medium">Description</p>
              <p className="whitespace-pre-wrap text-muted-foreground">{job.description}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="font-medium">Posted by {employer.companyName}{employer.isVerified ? ' ✅' : ''}</p>
              <p className="text-muted-foreground">{employer.user?.email} · {employer.location ?? '—'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Approval / decision panel */}
        <Card>
          <CardHeader><CardTitle>Review decision</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            {job.status === 'PENDING' ? (
              <>
                <p className="rounded-md border border-amber-300 bg-amber-50 p-2 text-amber-900 dark:bg-amber-950/20">
                  This job is awaiting admin approval.
                </p>
                <div>
                  <p className="mb-1 font-medium">Notes (optional, sent to employer)</p>
                  <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any notes for approval..." />
                  <Button className="mt-2 w-full" onClick={() => run(() => approveJob.mutateAsync({ id: job.id, notes: notes || undefined }), 'Job approved — now ACTIVE')}>
                    Approve job
                  </Button>
                </div>
                <div>
                  <p className="mb-1 font-medium">Rejection reason (required)</p>
                  <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this job being rejected?" />
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Button
                      variant="destructive"
                      onClick={() => {
                        if (!reason.trim()) return toast.error('A rejection reason is required');
                        run(() => rejectJob.mutateAsync({ id: job.id, reason: reason.trim() }), 'Job rejected');
                      }}
                    >
                      Reject
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        if (!reason.trim()) return toast.error('Describe the requested changes');
                        run(() => requestChanges.mutateAsync({ id: job.id, reason: reason.trim() }), 'Changes requested');
                      }}
                    >
                      Request changes
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">
                Status: <strong className="text-foreground">{job.status}</strong>.
                {job.status === 'ACTIVE' && ' This job is live and accepting applications.'}
                {job.status === 'DRAFT' && ' Drafts cannot be approved until the employer submits them.'}
                {job.status === 'CLOSED' && ' Closed jobs no longer accept applications.'}
                {job.status === 'REJECTED' && ' This job was rejected.'}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Applications (first 10) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Applications ({job.applicationsCount ?? job._count?.applications ?? 0})
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/applications">View all applications</Link>
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(job.applications ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No applications yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="p-3">Student</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Match</th>
                    <th className="p-3">Applied</th>
                  </tr>
                </thead>
                <tbody>
                  {job.applications.map((a: any) => (
                    <tr key={a.id} className="border-b">
                      <td className="p-3">
                        <Link className="font-medium hover:underline" href={`/admin/applications/${a.id}`}>
                          {a.student?.user?.name ?? 'Student'}
                        </Link>
                      </td>
                      <td className="p-3"><Badge variant={a.status === 'HIRED' ? 'outline' : 'secondary'}>{a.status}</Badge></td>
                      <td className="p-3">{a.matchScore}%</td>
                      <td className="p-3 text-muted-foreground">{fmt(a.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

