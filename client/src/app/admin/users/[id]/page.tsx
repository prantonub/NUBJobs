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
  useAdminUserDetail,
  useBanUser,
  useDeleteUser,
  useResetPassword,
  useSendAdminMessage,
} from '@/hooks/useAdmin';
import { getErrorMessage } from '@/lib/utils';

const fmt = (v?: string | null) => (v ? new Date(v).toLocaleString() : '—');

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: user, isLoading, refetch } = useAdminUserDetail(id);
  const banUser = useBanUser();
  const resetPassword = useResetPassword();
  const deleteUser = useDeleteUser();
  const sendMessage = useSendAdminMessage();

  const [status, setStatus] = useState('ACTIVE');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  if (isLoading) {
    return <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">Loading user...</div>;
  }
  if (!user) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        User not found. <Link className="underline" href="/admin/users">Back to users</Link>
      </div>
    );
  }

  const profile: any = user.profile ?? {};
  const isStudent = user.role === 'STUDENT';
  const isEmployer = user.role === 'EMPLOYER';

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      toast.success(ok);
      refetch();
    } catch (e) {
      toast.error(getErrorMessage(e, 'Action failed'));
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      {/* Left — profile card */}
      <Card>
        <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="text-lg font-semibold">{user.name}</p>
            <p className="text-muted-foreground">{user.email}</p>
            {user.phone && <p className="text-muted-foreground">{user.phone}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{user.role}</Badge>
            <Badge variant={user.status === 'BANNED' ? 'destructive' : 'outline'}>{user.status}</Badge>
          </div>
          <p className="text-muted-foreground">Joined: {fmt(user.joinedAt)}</p>
          <p className="text-muted-foreground">Last active: {fmt(user.lastLogin)}</p>
        </CardContent>
      </Card>

      {/* Center — role details + activity */}
      <Card>
        <CardHeader><CardTitle>{isStudent ? 'Student details' : isEmployer ? 'Company details' : 'Details'}</CardTitle></CardHeader>
        <CardContent className="space-y-4 text-sm">
          {isStudent && (
            <dl className="grid grid-cols-2 gap-2">
              <div><dt className="text-muted-foreground">CGPA</dt><dd className="font-medium">{profile.cgpa ?? '—'}</dd></div>
              <div><dt className="text-muted-foreground">Department</dt><dd className="font-medium">{profile.department ?? '—'}</dd></div>
              <div className="col-span-2">
                <dt className="text-muted-foreground">Skills</dt>
                <dd className="flex flex-wrap gap-1 pt-1">
                  {(profile.skills ?? []).length
                    ? profile.skills.map((s: string) => <Badge key={s} variant="secondary">{s}</Badge>)
                    : '—'}
                </dd>
              </div>
              <div><dt className="text-muted-foreground">Applications</dt><dd className="font-medium">{profile._count?.applications ?? 0}</dd></div>
              <div><dt className="text-muted-foreground">Saved jobs</dt><dd className="font-medium">{profile._count?.savedJobs ?? 0}</dd></div>
            </dl>
          )}
          {isEmployer && (
            <dl className="grid grid-cols-2 gap-2">
              <div><dt className="text-muted-foreground">Company</dt><dd className="font-medium">{profile.companyName ?? '—'}</dd></div>
              <div><dt className="text-muted-foreground">Verified</dt><dd className="font-medium">{profile.isVerified ? 'Yes' : 'No'}</dd></div>
              <div><dt className="text-muted-foreground">Jobs posted</dt><dd className="font-medium">{profile._count?.jobs ?? 0}</dd></div>
              <div><dt className="text-muted-foreground">Location</dt><dd className="font-medium">{profile.location ?? '—'}</dd></div>
            </dl>
          )}
          {!isStudent && !isEmployer && <p className="text-muted-foreground">Administrator account.</p>}

          {isStudent && (profile.applications ?? []).length > 0 && (
            <div>
              <p className="mb-2 font-medium">Recent applications</p>
              <ul className="space-y-1">
                {profile.applications.map((a: any) => (
                  <li key={a.id} className="flex justify-between gap-2 border-b border-border pb-1 last:border-0">
                    <Link className="truncate hover:underline" href={`/admin/applications/${a.id}`}>{a.job?.title}</Link>
                    <span className="shrink-0 text-xs text-muted-foreground">{a.status}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {isEmployer && (profile.jobs ?? []).length > 0 && (
            <div>
              <p className="mb-2 font-medium">Jobs</p>
              <ul className="space-y-1">
                {profile.jobs.map((j: any) => (
                  <li key={j.id} className="flex justify-between gap-2 border-b border-border pb-1 last:border-0">
                    <Link className="truncate hover:underline" href={`/admin/jobs/${j.id}`}>{j.title}</Link>
                    <span className="shrink-0 text-xs text-muted-foreground">{j.status}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <p className="mb-2 font-medium">Activity log</p>
            {(user.activityLog ?? []).length === 0 ? (
              <p className="text-muted-foreground">No recorded activity yet.</p>
            ) : (
              <ul className="space-y-1 text-xs text-muted-foreground">
                {user.activityLog.map((l: any) => (
                  <li key={l.id} className="flex justify-between gap-2">
                    <span className="truncate">{l.action} {l.details ? `· ${l.details}` : ''}</span>
                    <span className="shrink-0">{fmt(l.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Right — admin actions */}
      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Change status</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <select
              className="w-full rounded-md border px-3 py-2 text-sm"
              aria-label="Account status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="BANNED">BANNED</option>
            </select>
            <Textarea
              placeholder="Reason (required when banning/suspending)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
            <Button
              className="w-full"
              onClick={() =>
                run(
                  () => banUser.mutateAsync({ id: user.id, status: status as any, reason: reason || undefined }),
                  'User status updated'
                )
              }
            >
              Apply status
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Maintenance</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="w-full"
              onClick={async () => {
                try {
                  const res: any = await resetPassword.mutateAsync(user.id);
                  setTempPassword(res?.tempPassword ?? null);
                  toast.success('Temporary password generated (expires in 24h)');
                } catch (e) {
                  toast.error(getErrorMessage(e, 'Reset failed'));
                }
              }}
            >
              Reset password
            </Button>
            {tempPassword && (
              <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:bg-amber-950/20">
                <p className="font-medium">Temp password: <code className="select-all">{tempPassword}</code></p>
                <p className="text-xs text-muted-foreground">Expires in 24h · share securely, user must change it.</p>
              </div>
            )}
            <Textarea
              placeholder="Message to this user..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
            <Button
              variant="outline"
              className="w-full"
              disabled={!note.trim()}
              onClick={() =>
                run(async () => {
                  await sendMessage.mutateAsync({ userId: user.id, message: note.trim() });
                  setNote('');
                }, 'Message sent')
              }
            >
              Send message
            </Button>
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => {
                if (!confirm(`Delete ${user.email}? This cannot be undone.`)) return;
                run(() => deleteUser.mutateAsync(user.id), 'User deleted');
              }}
            >
              Delete account
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

