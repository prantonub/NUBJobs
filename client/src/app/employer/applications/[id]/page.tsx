'use client';

import { FC, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  useEmployerApplicationDetail,
  useUpdateApplicationNotes,
  useUpdateApplicationStatus,
} from '@/hooks/useEmployer';
import { useApplicationRealtime } from '@/hooks/useApplicationRealtime';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ApplicationStatusBadge, type ApplicationStatus } from '@/components/ui/ApplicationStatusBadge';
import { Progress } from '@/components/ui/progress';
import StatusTimeline from '@/components/applications/StatusTimeline';
import ApplicationChat from '@/components/applications/ApplicationChat';
import { toast } from 'sonner';
import { ArrowLeft, Check, ExternalLink, Loader2, Mail, X } from 'lucide-react';
import { getErrorMessage } from '@/lib/utils';

/**
 * /employer/applications/[id] — candidate review screen:
 * left = student profile, centre = application + match + timeline + notes,
 * right = status actions and the real-time message thread.
 */
const EmployerApplicationDetailPage: FC = () => {
  const params = useParams<{ id: string }>();
  const applicationId = typeof params?.id === 'string' ? params.id : '';

  useApplicationRealtime('EMPLOYER');
  const { data: application, isLoading } = useEmployerApplicationDetail(applicationId);
  const statusMutation = useUpdateApplicationStatus();
  const notesMutation = useUpdateApplicationNotes();

  const [nextStatus, setNextStatus] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (application) setNotes(application.notes ?? '');
  }, [application]);

  if (isLoading) {
    return <p className="p-8 text-center text-sm text-muted-foreground">Loading application…</p>;
  }

  if (!application) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-muted-foreground">Application not found.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/employer/applications">Back to applications</Link>
        </Button>
      </div>
    );
  }

  const student = application.student ?? {};
  const job = application.job ?? {};
  const breakdown = application.matchBreakdown ?? { skillChecklist: [] };
  const timeline = application.timeline ?? [];
  const transitions: string[] = application.allowedTransitions ?? [];

  const updateStatus = async () => {
    if (!nextStatus) return;
    try {
      await statusMutation.mutateAsync({ id: applicationId, status: nextStatus, notes });
      toast.success(`Application moved to ${nextStatus}`);
      setNextStatus('');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update status'));
    }
  };

  const saveNotes = async () => {
    try {
      await notesMutation.mutateAsync({ id: applicationId, notes });
      toast.success('Notes saved');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to save notes'));
    }
  };

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/employer/applications">
          <ArrowLeft className="size-4" />
          Back to applications
        </Link>
      </Button>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left: student profile */}
        <Card className="p-6 lg:col-span-3">
          <div className="flex items-center gap-3">
            {student.photoUrl ? (
              <img
                src={student.photoUrl}
                alt={student.user?.name ?? 'Candidate'}
                className="size-14 rounded-full object-cover"
              />
            ) : (
              <span className="flex size-14 items-center justify-center rounded-full bg-muted font-semibold">
                {(student.user?.name ?? 'C').charAt(0).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate font-semibold">{student.user?.name}</p>
              <p className="truncate text-xs text-muted-foreground">{student.user?.email}</p>
            </div>
          </div>

          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">CGPA</dt>
              <dd className="font-medium">{student.cgpa ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Department</dt>
              <dd className="font-medium">{student.department ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Location</dt>
              <dd className="font-medium">{student.location ?? '—'}</dd>
            </div>
          </dl>

          <p className="mt-4 text-xs font-medium text-muted-foreground">Skills</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {(student.skills ?? []).length ? (
              (student.skills as string[]).map((skill) => (
                <span key={skill} className="rounded-full bg-muted px-2 py-0.5 text-xs">
                  {skill}
                </span>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">No skills listed</span>
            )}
          </div>

          {student.resumeUrl ? (
            <Button asChild variant="outline" size="sm" className="mt-4 w-full">
              <a href={student.resumeUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="size-3.5" />
                Resume
              </a>
            </Button>
          ) : null}

          <Button asChild variant="ghost" size="sm" className="mt-2 w-full">
            <a href={`mailto:${student.user?.email ?? ''}`}>
              <Mail className="size-3.5" />
              Email candidate
            </a>
          </Button>
        </Card>

        {/* Centre: application */}
        <div className="space-y-6 lg:col-span-6">
          <Card className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold">{job.title}</h1>
                <p className="text-xs text-muted-foreground">
                  Applied {new Date(application.appliedAt ?? application.createdAt).toLocaleString()}
                </p>
              </div>
              <ApplicationStatusBadge status={application.status as ApplicationStatus} />
            </div>

            <div className="mt-4 rounded-lg border bg-muted/40 p-4">
              <p className="text-xs font-medium text-muted-foreground">Cover letter</p>
              <p className="mt-1 whitespace-pre-wrap text-sm">
                {application.coverLetter || 'No cover letter submitted.'}
              </p>
            </div>
          </Card>

          <Card className="p-6">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-semibold">Match Score Breakdown</h2>
              <span className="font-bold">{application.matchScore}%</span>
            </div>
            <Progress value={application.matchScore} />
            {Array.isArray(breakdown.skillChecklist) && breakdown.skillChecklist.length > 0 && (
              <ul className="mt-3 space-y-1 text-sm">
                {breakdown.skillChecklist.map((item: { skill: string; has: boolean }) => (
                  <li key={item.skill} className="flex items-center gap-2">
                    {item.has ? (
                      <Check className="size-4 text-emerald-600" />
                    ) : (
                      <X className="size-4 text-red-500" />
                    )}
                    <span className={item.has ? '' : 'text-muted-foreground'}>{item.skill}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="mb-4 font-semibold">Status Timeline</h2>
            <StatusTimeline steps={timeline} />
          </Card>
        </div>

        {/* Right: status actions + messages */}
        <div className="space-y-6 lg:col-span-3">
          <Card className="p-6">
            <h2 className="mb-3 font-semibold">Update Status</h2>
            {transitions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                This application is {String(application.status).toLowerCase()} — no further transitions.
              </p>
            ) : (
              <div className="space-y-3">
                <select
                  className="w-full rounded-md border bg-background px-2 py-2 text-sm"
                  value={nextStatus}
                  onChange={(event) => setNextStatus(event.target.value)}
                >
                  <option value="">Choose status…</option>
                  {transitions.map((status) => (
                    <option key={status} value={status}>
                      {status.charAt(0) + status.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
                <Button
                  className="w-full"
                  disabled={!nextStatus || statusMutation.isPending}
                  onClick={() => void updateStatus()}
                >
                  {statusMutation.isPending && <Loader2 className="size-4 animate-spin" />}
                  Save status
                </Button>
                <p className="text-xs text-muted-foreground">
                  The candidate is emailed and notified in-app automatically.
                </p>
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="mb-2 font-semibold">Notes (private)</h2>
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              placeholder="Feedback, interview impressions, next steps…"
              className="resize-none"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2 w-full"
              onClick={() => void saveNotes()}
              disabled={notesMutation.isPending}
            >
              {notesMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
              Save notes
            </Button>
          </Card>

          <Card className="p-6" id="messages">
            <h2 className="mb-3 font-semibold">Messages</h2>
            <div className="h-80">
              <ApplicationChat applicationId={applicationId} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EmployerApplicationDetailPage;
