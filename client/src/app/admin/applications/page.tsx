"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAdminApplications, useAdminJobs, useAdminPipeline } from '@/hooks/useAdmin';

const STATUSES = ['APPLIED', 'REVIEWED', 'SHORTLISTED', 'INTERVIEWED', 'HIRED', 'REJECTED'] as const;
const COLUMN: Record<string, string> = {
  APPLIED: 'applied', REVIEWED: 'reviewed', SHORTLISTED: 'shortlisted',
  INTERVIEWED: 'interviewed', HIRED: 'hired', REJECTED: 'rejected',
};
const VARIANTS: Record<string, 'secondary' | 'outline' | 'destructive'> = {
  APPLIED: 'secondary', REVIEWED: 'outline', SHORTLISTED: 'outline',
  INTERVIEWED: 'secondary', HIRED: 'outline', REJECTED: 'destructive',
};
const fmt = (v?: string | null) => (v ? new Date(v).toLocaleDateString() : '—');

export default function AdminApplicationsPage() {
  const [status, setStatus] = useState('ALL');
  const [jobId, setJobId] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useAdminApplications({
    status: status === 'ALL' ? undefined : status,
    jobId: jobId === 'ALL' ? undefined : jobId,
    search: search || undefined,
    page,
    limit: 20,
  });
  const { data: jobsData } = useAdminJobs({ limit: 100 });
  const { data: pipeline } = useAdminPipeline();

  const applications = data?.applications ?? [];
  const totalPages = data?.totalPages ?? 1;
  const statCards = [
    { label: 'Total', value: data?.total ?? applications.length },
    ...STATUSES.map((s) => ({ label: s, value: pipeline?.[COLUMN[s]]?.length ?? 0 })),
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-7">
        {statCards.map((s) => (
          <Card key={s.label} className="p-3">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="font-heading text-xl font-bold tabular-nums">{s.value}</p>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">All Applications Monitoring</h2>
            <p className="text-sm text-muted-foreground">Every application across the platform.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Input placeholder="Search student/job..." className="w-48" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            <select className="rounded-md border px-3 py-2 text-sm" aria-label="Filter by job" value={jobId} onChange={(e) => { setJobId(e.target.value); setPage(1); }}>
              <option value="ALL">All jobs</option>
              {(jobsData?.jobs ?? []).map((j: any) => <option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
            <select className="rounded-md border px-3 py-2 text-sm" aria-label="Filter by status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="ALL">All statuses</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="p-3">Student</th>
                <th className="p-3">Job</th>
                <th className="p-3">Company</th>
                <th className="p-3">Status</th>
                <th className="p-3">Match</th>
                <th className="p-3">Applied</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="p-4 text-muted-foreground">Loading applications...</td></tr>
              ) : applications.length === 0 ? (
                <tr><td colSpan={7} className="p-4 text-muted-foreground">No applications match these filters.</td></tr>
              ) : applications.map((a: any) => (
                <tr key={a.id} className="border-b">
                  <td className="p-3 font-medium">{a.student}</td>
                  <td className="p-3">{a.job}</td>
                  <td className="p-3 text-muted-foreground">{a.company}</td>
                  <td className="p-3"><Badge variant={VARIANTS[a.status] ?? 'secondary'}>{a.status}</Badge></td>
                  <td className="p-3 tabular-nums">{a.matchScore}%</td>
                  <td className="p-3 text-muted-foreground">{fmt(a.appliedAt)}</td>
                  <td className="p-3">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/admin/applications/${a.id}`}>View</Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>Total: {data?.total ?? applications.length}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
            <span className="px-2 py-1">Page {page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
