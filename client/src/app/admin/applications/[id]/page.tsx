"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useAdminApplicationDetail, useAdminApplicationStatus, useSendAdminMessage } from '@/hooks/useAdmin';
import { getErrorMessage } from '@/lib/utils';

const fmt = (v?: string | null) => (v ? new Date(v).toLocaleString() : '—');
const STATUSES = ['REVIEWED', 'SHORTLISTED', 'INTERVIEWED', 'HIRED', 'REJECTED'];

export default function AdminApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: app, isLoading, refetch } = useAdminApplicationDetail(id);
  const setStatus = useAdminApplicationStatus();
  const sendMessage = useSendAdminMessage();

  const [nextStatus, setNextStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');

  if (isLoading) {
    return <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">Loading application...</div>;
  }
  if (!app) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        Application not found. <Link className="underline" href="/admin/applications">Back</Link>
      </div>
    );
  }

  const student: any = app.student ?? {};
  const job: any = app.job ?? {};
  const skills: string[] = Array.isArray(student.skills) ? student.skills : [];
  const studentUserId = student.user?.id;

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
      {/* Left — student profile */}
      <Card className="xl:sticky xl:top-4 xl:self-start">
        <CardHeader><CardTitle>Student</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="text-lg font-semibold">{student.user?.name ?? 'Student'}</p>
            <p className="text-muted-foreground">{student.user?.email}</p>
          </div>
          <dl className="grid grid-cols-2 gap-2">
            <div><dt className="text-muted-foreground">CGPA</dt><dd className="font-medium">{student.cgpa ?? '—'}</dd></div>
            <div><dt className="text-muted-foreground">Department</dt><dd className="font-medium">{student.department ?? '—'}</dd></div>
          </dl>
          <div className="flex flex-wrap gap-1">
            {skills.length ? skills.slice(0, 8).map((s) => <Badge key={s} variant="secondary">{s}</Badge>) : <span className="text-muted-foreground">No skills</span>}
          </div>
          {student.resumeUrl && (
            <Button variant="outline" size="sm" asChild>
              <a href={student.resumeUrl} target="_blank" rel="noreferrer">Download resume</a>
            </Button>
          )}
          {studentUserId && (
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/admin/users/${studentUserId}`}>View full profile</Link>
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Center — application details */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{job.title}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {job.employer?.companyName} · submitted {fmt(app.appliedAt ?? app.createdAt)}
            </p>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{app.status}</Badge>
              <Badge variant="outline">Match {app.matchScore}%</Badge>
              <Badge variant="outline">{app.reviewedAt ? `Reviewed ${fmt(app.reviewedAt)}` : 'Not reviewed'}</Badge>
            </div>

            {app.coverLetter ? (
              <div>
                <p className="mb-1 font-medium">Cover letter</p>
                <p className="whitespace-pre-wrap rounded-lg border border-border bg-muted/30 p-3 text-muted-foreground">
                  {app.coverLetter}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">No cover letter provided.</p>
            )}

            <div>
              <p className="mb-1 font-medium">Status timeline</p>
              <ol className="space-y-2">
                {(app.timeline ?? []).map((t: any, i: number) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <span className="flex size-6 items-center justify-center rounded-full border text-xs font-semibold">
                      {i + 1}
                    </span>
                    <span className="font-medium">{t.status}</span>
                    <span className="text-muted-foreground">{fmt(t.at)}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div>
              <p className="mb-2 font-medium">Messages ({(app.messages ?? []).length})</p>
              {(app.messages ?? []).length === 0 ? (
                <p className="text-muted-foreground">No messages yet.</p>
              ) : (
                <div className="max-h-72 space-y-2 overflow-y-auto rounded-lg border border-border p-3">
                  {app.messages.map((m: any) => (
                    <div key={m.id} className="text-sm">
                      <p className="text-xs text-muted-foreground">
                        {m.sender?.name} · {fmt(m.createdAt)}
                      </p>
                      <p>{m.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right — actions */}
      <div className="space-y-6 xl:sticky xl:top-4 xl:self-start">
        <Card>
          <CardHeader><CardTitle>Update status</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Current: <Badge variant="secondary">{app.status}</Badge>
            </p>
            <select
              className="w-full rounded-md border px-3 py-2 text-sm"
              aria-label="New status"
              value={nextStatus}
              onChange={(e) => setNextStatus(e.target.value)}
            >
              <option value="">Change to...</option>
              {STATUSES.filter((s) => s !== app.status).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <Textarea
              placeholder="Notes about this candidate..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
            <Button
              className="w-full"
              disabled={!nextStatus}
              onClick={() =>
                run(
                  () => setStatus.mutateAsync({ id: app.id, status: nextStatus, notes: notes || undefined }),
                  `Status updated to ${nextStatus}`
                )
              }
            >
              Save changes
            </Button>
          </CardContent>
        </Card>

        {studentUserId && (
          <Card>
            <CardHeader><CardTitle>Message student</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                placeholder={`Type message to ${student.user?.name ?? 'student'}...`}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
              <Button
                className="w-full"
                disabled={!message.trim()}
                onClick={() =>
                  run(async () => {
                    await sendMessage.mutateAsync({ userId: studentUserId, message: message.trim() });
                    setMessage('');
                  }, 'Message sent')
                }
              >
                Send message
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

