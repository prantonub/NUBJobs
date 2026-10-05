"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAdminDisputes } from '@/hooks/useAdmin';

const fmt = (v?: string | null) => (v ? new Date(v).toLocaleDateString() : '—');
const VARIANT: Record<string, 'secondary' | 'outline' | 'destructive'> = {
  OPEN: 'destructive', RESOLVED: 'outline', CLOSED: 'secondary',
};
const TYPES = ['GHOSTING', 'MISLEADING_JOB', 'COMMUNICATION', 'PAYMENT', 'OTHER'];

export default function AdminDisputesPage() {
  const [status, setStatus] = useState('ALL');
  const [type, setType] = useState('ALL');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useAdminDisputes({
    status: status === 'ALL' ? undefined : status,
    type: type === 'ALL' ? undefined : type,
    page,
    limit: 20,
  });
  // Lightweight totals for the stats row (limit=1 → only the count comes back).
  const { data: open } = useAdminDisputes({ status: 'OPEN', limit: 1 });
  const { data: resolved } = useAdminDisputes({ status: 'RESOLVED', limit: 1 });
  const { data: closed } = useAdminDisputes({ status: 'CLOSED', limit: 1 });

  const disputes = data?.disputes ?? [];
  const totalPages = data?.totalPages ?? 1;
  const stats = [
    { label: 'Total', value: (open?.total ?? 0) + (resolved?.total ?? 0) + (closed?.total ?? 0) },
    { label: 'Open', value: open?.total ?? 0 },
    { label: 'Resolved', value: resolved?.total ?? 0 },
    { label: 'Closed', value: closed?.total ?? 0 },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-3">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="font-heading text-xl font-bold tabular-nums">{s.value}</p>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Disputes &amp; Complaints</h2>
            <p className="text-sm text-muted-foreground">Investigate and resolve conflicts between students and employers.</p>
          </div>
          <div className="flex gap-2">
            <select className="rounded-md border px-3 py-2 text-sm" aria-label="Filter by status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="ALL">All statuses</option>
              <option value="OPEN">OPEN</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="CLOSED">CLOSED</option>
            </select>
            <select className="rounded-md border px-3 py-2 text-sm" aria-label="Filter by type" value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
              <option value="ALL">All types</option>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="p-3">Type</th>
                <th className="p-3">Student</th>
                <th className="p-3">Employer</th>
                <th className="p-3">Status</th>
                <th className="p-3">Created</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="p-4 text-muted-foreground">Loading disputes...</td></tr>
              ) : disputes.length === 0 ? (
                <tr><td colSpan={6} className="p-4 text-muted-foreground">No disputes. All quiet.</td></tr>
              ) : disputes.map((d: any) => (
                <tr key={d.id} className="border-b">
                  <td className="p-3 font-medium">{d.type}</td>
                  <td className="p-3">{d.student ?? '—'}</td>
                  <td className="p-3">{d.employer ?? '—'}</td>
                  <td className="p-3"><Badge variant={VARIANT[d.status] ?? 'secondary'}>{d.status}</Badge></td>
                  <td className="p-3 text-muted-foreground">{fmt(d.createdAt)}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/disputes/${d.id}`}>View</Link>
                      </Button>
                      {d.status === 'OPEN' && (
                        <Button variant="secondary" size="sm" asChild>
                          <Link href={`/admin/disputes/${d.id}`}>Resolve</Link>
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>Total: {data?.total ?? disputes.length}</span>
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
