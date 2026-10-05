"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useAdminDisputeDetail, useResolveDispute } from '@/hooks/useAdmin';
import { getErrorMessage } from '@/lib/utils';

const fmt = (v?: string | null) => (v ? new Date(v).toLocaleString() : '—');
const ACTIONS = ['NONE', 'WARN_STUDENT', 'WARN_EMPLOYER', 'BAN_STUDENT', 'BAN_EMPLOYER', 'REFUND', 'OTHER'];
const VARIANT: Record<string, 'secondary' | 'outline' | 'destructive'> = {
  OPEN: 'destructive', RESOLVED: 'outline', CLOSED: 'secondary',
};

export default function AdminDisputeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: dispute, isLoading, refetch } = useAdminDisputeDetail(id);
  const resolveDispute = useResolveDispute();

  const [action, setAction] = useState('NONE');
  const [resolution, setResolution] = useState('');

  if (isLoading) {
    return <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">Loading dispute...</div>;
  }
  if (!dispute) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        Dispute not found. <Link className="underline" href="/admin/disputes">Back to disputes</Link>
      </div>
    );
  }

  const student: any = dispute.student ?? {};
  const employer: any = dispute.employer ?? {};
  const isOpen = dispute.status === 'OPEN';

  const onResolve = async () => {
    if (!resolution.trim()) return toast.error('A resolution description is required');
    try {
      await resolveDispute.mutateAsync({ id: dispute.id, payload: { resolution: resolution.trim(), action } });
      toast.success('Dispute resolved — both parties notified');
      refetch();
    } catch (e) {
      toast.error(getErrorMessage(e, 'Failed to resolve dispute'));
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      {/* Left — parties */}
      <Card>
        <CardHeader><CardTitle>Parties involved</CardTitle></CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Student</p>
            <p className="font-medium">{student.user?.name ?? '—'}</p>
            <p className="text-muted-foreground">{student.user?.email ?? '—'}</p>
            {student.userId && (
              <Link className="text-xs underline" href={`/admin/users/${student.userId}`}>View profile</Link>
            )}
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Employer</p>
            <p className="font-medium">{employer.companyName ?? '—'}</p>
            <p className="text-muted-foreground">{employer.user?.email ?? '—'}</p>
            {employer.userId && (
              <Link className="text-xs underline" href={`/admin/users/${employer.userId}`}>View profile</Link>
            )}
          </div>
          <div className="rounded-lg border border-border p-3 text-xs text-muted-foreground">
            <p>Dispute ID: <code>{dispute.id}</code></p>
            <p>Type: {dispute.type}</p>
            <p>Created: {fmt(dispute.createdAt)}</p>
            <p>Updated: {fmt(dispute.updatedAt)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Center — complaint + timeline + chat */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Complaint
              <Badge variant={VARIANT[dispute.status] ?? 'secondary'}>{dispute.status}</Badge>
            </CardTitle>
            {dispute.title && <p className="text-sm text-muted-foreground">{dispute.title}</p>}
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="whitespace-pre-wrap rounded-lg border border-border bg-muted/30 p-3 text-muted-foreground">
              {dispute.description}
            </p>
            <div>
              <p className="mb-1 font-medium">Timeline</p>
              <ol className="space-y-1">
                {(dispute.timeline ?? []).map((t: any, i: number) => (
                  <li key={i} className="flex justify-between gap-2 text-sm">
                    <span>{t.event}</span>
                    <span className="text-muted-foreground">{fmt(t.at)}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <p className="mb-1 font-medium">Chat history (context only)</p>
              {(dispute.chatHistory ?? []).length === 0 ? (
                <p className="text-muted-foreground">No linked conversation.</p>
              ) : (
                <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-border p-3">
                  {dispute.chatHistory.map((m: any) => (
                    <div key={m.id}>
                      <p className="text-xs text-muted-foreground">{m.sender?.name} · {fmt(m.createdAt)}</p>
                      <p>{m.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right — resolution */}
      <Card className="xl:sticky xl:top-4 xl:self-start">
        <CardHeader><CardTitle>Resolution</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          {!isOpen ? (
            <div className="rounded-lg border border-border p-3">
              <p className="font-medium">Status: {dispute.status}</p>
              {dispute.action && <p className="text-muted-foreground">Action taken: {dispute.action}</p>}
              {dispute.resolution && <p className="mt-1 text-muted-foreground">{dispute.resolution}</p>}
              <p className="mt-2 text-xs text-muted-foreground">
                Resolved {fmt(dispute.resolvedAt)} — audit trail locked.
              </p>
            </div>
          ) : (
            <>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                aria-label="Resolution action"
                value={action}
                onChange={(e) => setAction(e.target.value)}
              >
                {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
              <Textarea
                placeholder="Resolution notes — both parties will be notified..."
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                rows={4}
              />
              <Button className="w-full" onClick={onResolve} disabled={resolveDispute.isPending}>
                {resolveDispute.isPending ? 'Saving...' : 'Save resolution'}
              </Button>
              <p className="text-xs text-muted-foreground">
                BAN_* actions suspend the target account immediately.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

