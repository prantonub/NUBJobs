'use client';

import { useState } from 'react';
import { Building2Icon, GraduationCapIcon, Loader2, SearchIcon, XCircleIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { VerifiedBadge } from '@/components/ui/verified-badge';
import { ViewVerificationDialog, type VerificationRow } from '@/components/admin/verification-view-dialog';
import {
  useProfileVerifications,
  useApproveProfileVerification,
  useRejectProfileVerification,
} from '@/hooks/useAdmin';
import { getErrorMessage } from '@/lib/utils';

type Tab = 'PENDING' | 'APPROVED' | 'REJECTED';
type RoleFilter = 'ALL' | 'STUDENT' | 'EMPLOYER';

/**
 * /admin/verifications — review queue for the blue verified badge.
 * 100%-complete students and employers land here; approving flips
 * `isVerified` (badge goes live) and lifts the apply/post-job gates.
 */
export default function AdminVerificationsPage() {
  const [tab, setTab] = useState<Tab>('PENDING');
  const [role, setRole] = useState<RoleFilter>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [rejectTarget, setRejectTarget] = useState<{ kind: string; id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  /** Open row for full-profile review before approving/rejecting. */
  const [viewTarget, setViewTarget] = useState<VerificationRow | null>(null);

  const { data, isLoading } = useProfileVerifications({ status: tab, role, search: search || undefined, page, limit: 20 });
  const approve = useApproveProfileVerification();
  const reject = useRejectProfileVerification();

  const rows: VerificationRow[] = data?.data ?? [];
  const pagination = data?.pagination ?? { page: 1, total: rows.length, totalPages: 1 };

  const setFilter = (patch: Partial<{ tab: Tab; role: RoleFilter; search: string }>) => {
    if ('tab' in patch) setTab(patch.tab!);
    if ('role' in patch) setRole(patch.role!);
    if ('search' in patch) setSearch(patch.search!);
    setPage(1);
  };

  const handleApprove = (row: VerificationRow) => {
    approve.mutate(
      { kind: row.kind.toLowerCase(), id: row.id },
      {
        onSuccess: () => {
          toast.success(`${row.name} verified — blue badge is live`);
          setViewTarget(null);
        },
        onError: (error) => toast.error(getErrorMessage(error, 'Failed to approve')),
      }
    );
  };

  const handleReject = () => {
    if (!rejectTarget) return;
    if (rejectReason.trim().length < 3) {
      toast.error('A reason (min 3 chars) is required');
      return;
    }
    reject.mutate(
      { kind: rejectTarget.kind, id: rejectTarget.id, reason: rejectReason.trim() },
      {
        onSuccess: () => {
          toast.success(`Verification rejected for ${rejectTarget.name}`);
          setRejectTarget(null);
          setRejectReason('');
        },
        onError: (error) => toast.error(getErrorMessage(error, 'Failed to reject')),
      }
    );
  };

  const tabs: Tab[] = ['PENDING', 'APPROVED', 'REJECTED'];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Profile Verifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review 100%-complete profiles — approval grants the blue verified badge and unlocks job
            applications / postings.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setFilter({ search: event.target.value })}
              placeholder="Search name or email..."
              className="w-56 pl-8"
            />
          </div>
          <select
            value={role}
            onChange={(event) => setFilter({ role: event.target.value as RoleFilter })}
            className="h-9 rounded-md border border-border bg-background px-2 text-sm"
          >
            <option value="ALL">All roles</option>
            <option value="STUDENT">Students</option>
            <option value="EMPLOYER">Employers</option>
          </select>
        </div>
      </div>

      {/* Tabs + count */}
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((t) => (
          <Button
            key={t}
            size="sm"
            variant={tab === t ? 'default' : 'outline'}
            onClick={() => setFilter({ tab: t })}
          >
            {t.charAt(0) + t.slice(1).toLowerCase()}
            {t === tab && pagination.total ? <span className="ml-1.5 opacity-80">({pagination.total})</span> : null}
          </Button>
        ))}
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </div>
        ) : rows.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">
            {tab === 'PENDING' ? 'No verification requests waiting for review.' : 'No ' + tab.toLowerCase() + ' profiles.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Profile</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Completion</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3">Details</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.kind + '-' + row.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {row.photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={row.photo} alt="" className="size-8 rounded-full object-cover" />
                        ) : (
                          <div className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                            {row.name?.charAt(0)?.toUpperCase() ?? '?'}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="flex items-center gap-1 font-medium">
                            {row.name}
                            {row.isVerified ? <VerifiedBadge /> : null}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">{row.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={row.kind === 'STUDENT' ? 'secondary' : 'outline'} className="gap-1">
                        {row.kind === 'STUDENT' ? <GraduationCapIcon className="size-3" /> : <Building2Icon className="size-3" />}
                        {row.kind}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {row.completion !== null ? (
                        <span className={row.completion === 100 ? 'font-medium text-emerald-600' : 'text-muted-foreground'}>
                          {row.completion}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {row.submittedAt ? new Date(row.submittedAt).toLocaleString() : '—'}
                    </td>
                    <td className="max-w-56 px-4 py-3 text-xs text-muted-foreground">
                      {row.kind === 'STUDENT'
                        ? [row.detail?.nubId, row.detail?.cgpa ? 'CGPA ' + row.detail.cgpa : null, row.detail?.department]
                            .filter(Boolean)
                            .join(' · ') || '—'
                        : [row.detail?.location, row.detail?.industry].filter(Boolean).join(' · ') || '—'}
                      {row.rejectReason && tab === 'REJECTED' ? (
                        <p className="mt-0.5 text-red-500">Reason: {row.rejectReason}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {tab === 'PENDING' ? (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => setViewTarget(row)}>View</Button>
                          <Button size="sm" onClick={() => handleApprove(row)} disabled={approve.isPending}>
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setRejectTarget({ kind: row.kind.toLowerCase(), id: row.id, name: row.name });
                              setRejectReason('');
                            }}
                          >
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {row.verifiedAt ? 'Approved ' + new Date(row.verifiedAt).toLocaleDateString() : 'Closed'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {/* Pagination */}
      {pagination.totalPages > 1 ? (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} total
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}

      {/* Reject dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject verification</DialogTitle>
            <DialogDescription>
              {rejectTarget?.name} will see the reason on their profile and can fix the issue and re-submit.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            placeholder="Reason (min 3 chars) — e.g. resume unreadable, photo does not match"
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={reject.isPending}>
              {reject.isPending ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <XCircleIcon className="mr-1.5 size-4" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Full-profile review dialog (separate root — Radix DialogContent must be an only child) */}
      {viewTarget ? (
        <ViewVerificationDialog
          open={!!viewTarget}
          onOpenChange={(open) => !open && setViewTarget(null)}
          target={viewTarget}
          tab={tab}
          approve={{ isPending: approve.isPending }}
          approveFn={() => handleApprove(viewTarget)}
          setRejectTarget={setRejectTarget}
        />
      ) : null}
    </div>
  );
}