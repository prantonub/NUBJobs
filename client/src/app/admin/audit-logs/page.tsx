"use client";

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuditLogs } from '@/hooks/useAdmin';

const fmt = (v?: string | null) => (v ? new Date(v).toLocaleString() : '—');

export default function AdminAuditLogsPage() {
  const [action, setAction] = useState('');
  const [adminId, setAdminId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useAuditLogs({
    action: action || undefined,
    adminId: adminId || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    page,
    limit: 50,
  });

  const logs = data?.logs ?? [];
  const totalPages = data?.totalPages ?? 1;

  const exportCsv = () => {
    const rows: string[][] = [
      ['Timestamp', 'Admin', 'Action', 'Resource', 'Details', 'IP'],
      ...logs.map((l: any) => [l.timestamp, l.adminName, l.action, l.resource, l.details ?? '', l.ipAddress ?? '']),
    ];
    const csv = rows.map((r: string[]) => r.map((c: string) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'audit-logs.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Admin Activity Logs</h2>
          <p className="text-sm text-muted-foreground">Every privileged action, timestamped with IP. SUPER_ADMIN only.</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={logs.length === 0}>
          Export CSV
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Input
          placeholder="Action (e.g. approve_job)..."
          className="w-48"
          value={action}
          onChange={(e) => { setAction(e.target.value); setPage(1); }}
        />
        <Input
          placeholder="Admin ID..."
          className="w-56"
          value={adminId}
          onChange={(e) => { setAdminId(e.target.value); setPage(1); }}
        />
        <Input type="date" aria-label="From date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} />
        <Input type="date" aria-label="To date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="p-3">Timestamp</th>
              <th className="p-3">Admin</th>
              <th className="p-3">Action</th>
              <th className="p-3">Resource</th>
              <th className="p-3">Details</th>
              <th className="p-3">IP</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="p-4 text-muted-foreground">Loading audit logs...</td></tr>
            ) : isError ? (
              <tr><td colSpan={6} className="p-4 text-amber-700">Your admin role cannot view audit logs.</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={6} className="p-4 text-muted-foreground">No audit entries match these filters.</td></tr>
            ) : (
              logs.map((l: any) => (
                <tr key={l.id} className="border-b align-top">
                  <td className="p-3 whitespace-nowrap text-muted-foreground">{fmt(l.timestamp)}</td>
                  <td className="p-3">{l.adminName}</td>
                  <td className="p-3"><Badge variant="secondary">{l.action}</Badge></td>
                  <td className="p-3 text-muted-foreground">{l.resource}</td>
                  <td className="p-3 max-w-xs truncate" title={l.details ?? ''}>{l.details ?? '—'}</td>
                  <td className="p-3 text-muted-foreground">{l.ipAddress ?? '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
        <span>Total: {data?.total ?? logs.length}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
          <span className="px-2 py-1">Page {page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      </div>
    </Card>
  );
}
