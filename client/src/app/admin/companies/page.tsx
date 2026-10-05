"use client";

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  useAdminCompanies,
  useRejectCompany,
  useRevokeCompany,
  useVerificationRequests,
  useVerifyCompany,
} from '@/hooks/useAdmin';
import { getErrorMessage } from '@/lib/utils';

const TABS = ['PENDING', 'VERIFIED', 'REJECTED'] as const;
type Tab = (typeof TABS)[number];
const fmt = (v?: string | null) => (v ? new Date(v).toLocaleDateString() : '—');

export default function AdminCompaniesPage() {
  const [tab, setTab] = useState<Tab>('PENDING');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const reqStatus: Record<Tab, string> = { PENDING: 'PENDING', VERIFIED: 'APPROVED', REJECTED: 'REJECTED' };
  const { data: reqData, isLoading, refetch } = useVerificationRequests({
    status: reqStatus[tab], page, limit: 20, search: search || undefined,
  });
  const { data: pendingStats } = useVerificationRequests({ status: 'PENDING', limit: 1 });
  const { data: verifiedStats } = useVerificationRequests({ status: 'APPROVED', limit: 1 });
  const { data: rejectedStats } = useVerificationRequests({ status: 'REJECTED', limit: 1 });
  const { data: verifiedList } = useAdminCompanies({ verified: 'true', limit: 20 });

  const verifyCompany = useVerifyCompany();
  const rejectCompany = useRejectCompany();
  const revokeCompany = useRevokeCompany();

  const requests = reqData?.requests ?? [];
  const totalPages = reqData?.totalPages ?? 1;
  const verifiedById = new Map(((verifiedList?.companies ?? []) as any[]).map((c) => [c.id, c]));

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      toast.success(ok);
      refetch();
    } catch (e) {
      toast.error(getErrorMessage(e, 'Action failed'));
    }
  };

  const stats = [
    { label: 'Pending', value: pendingStats?.total ?? 0 },
    { label: 'Verified', value: verifiedStats?.total ?? 0 },
    { label: 'Rejected', value: rejectedStats?.total ?? 0 },
    {
      label: 'Total companies',
      value: (pendingStats?.total ?? 0) + (verifiedStats?.total ?? 0) + (rejectedStats?.total ?? 0),
    },
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
            <h2 className="text-xl font-semibold">Company Management &amp; Verification</h2>
            <p className="text-sm text-muted-foreground">Review documents, grant badges, revoke when needed.</p>
          </div>
          <input
            className="rounded-md border px-3 py-2 text-sm"
            placeholder="Search company..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        <div className="mb-4 flex gap-2">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setTab(t); setPage(1); }}
              className={`rounded-md px-3 py-1.5 text-sm ${tab === t ? 'bg-foreground text-background' : 'border border-border hover:bg-muted'}`}
            >
              {t === 'PENDING' ? 'Pending Verification' : t === 'VERIFIED' ? 'Verified Companies' : 'Rejected'}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="p-3">Company</th>
                <th className="p-3">{tab === 'VERIFIED' ? 'Verified date' : tab === 'REJECTED' ? 'Rejected' : 'Submitted'}</th>
                <th className="p-3">Document</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={4} className="p-4 text-muted-foreground">Loading...</td></tr>
              ) : requests.length === 0 ? (
                <tr><td colSpan={4} className="p-4 text-muted-foreground">Nothing here — no {tab.toLowerCase()} companies.</td></tr>
              ) : requests.map((r: any) => {
                const verified = verifiedById.get(r.id);
                return (
                  <tr key={r.id} className="border-b">
                    <td className="p-3">
                      <p className="font-medium">{r.company}</p>
                      <p className="text-xs text-muted-foreground">{r.email}</p>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {fmt(tab === 'VERIFIED' ? verified?.verificationDate : r.submittedAt)}
                    </td>
                    <td className="p-3">
                      {r.document ? (
                        <a className="text-xs underline" href={r.document} target="_blank" rel="noreferrer">View document</a>
                      ) : (
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        {tab === 'PENDING' && (
                          <>
                            <Button size="sm" onClick={() => run(() => verifyCompany.mutateAsync({ id: r.id }), 'Company verified')}>
                              Approve
                            </Button>
                            <Button
                              size="sm" variant="secondary"
                              onClick={() => {
                                const reason = prompt('Rejection reason (required):');
                                if (!reason?.trim()) return;
                                run(() => rejectCompany.mutateAsync({ id: r.id, reason: reason.trim() }), 'Verification rejected');
                              }}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {tab === 'VERIFIED' && (
                          <Button
                            size="sm" variant="destructive"
                            onClick={() => {
                              const reason = prompt('Reason for revoking the badge (optional):') ?? undefined;
                              run(() => revokeCompany.mutateAsync({ id: r.id, reason: reason || undefined }), 'Badge revoked');
                            }}
                          >
                            Revoke badge
                          </Button>
                        )}
                        {tab === 'REJECTED' && (
                          <Button
                            size="sm" variant="outline"
                            onClick={() => run(() => verifyCompany.mutateAsync({ id: r.id }), 'Company verified after re-review')}
                          >
                            Approve now
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>Total: {reqData?.total ?? requests.length}</span>
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

