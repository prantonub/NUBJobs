'use client';

import { FC } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useApplicationDetail } from '@/hooks/useApplications';
import { useApplicationRealtime } from '@/hooks/useApplicationRealtime';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ApplicationStatusBadge, type ApplicationStatus } from '@/components/ui/ApplicationStatusBadge';
import { Progress } from '@/components/ui/progress';
import StatusTimeline from '@/components/applications/StatusTimeline';
import ApplicationChat from '@/components/applications/ApplicationChat';
import { formatSalary } from '@/lib/utils';
import { ArrowLeft, Check, ExternalLink, X } from 'lucide-react';

/**
 * /dashboard/applications/[id] — the student's view of one application:
 * job + company, their cover letter, match breakdown, status timeline and the
 * real-time chat with the employer.
 */
const ApplicationDetailPage: FC = () => {
  const params = useParams<{ id: string }>();
  const applicationId = typeof params?.id === 'string' ? params.id : '';

  useApplicationRealtime('STUDENT');
  const { data: application, isLoading } = useApplicationDetail(applicationId);

  if (isLoading) {
    return <p className="p-8 text-center text-sm text-muted-foreground">Loading application…</p>;
  }

  if (!application) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-muted-foreground">Application not found.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/dashboard/applications">Back to applications</Link>
        </Button>
      </div>
    );
  }

  const job = application.job ?? {};
  const company = job.employer ?? {};
  const breakdown = application.matchBreakdown ?? { skillChecklist: [] };
  const timeline = application.timeline ?? [];
  const canWithdraw = !['HIRED', 'REJECTED', 'WITHDRAWN'].includes(application.status);

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/dashboard/applications">
          <ArrowLeft className="size-4" />
          Back to applications
        </Link>
      </Button>

      {/* Header */}
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{job.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {company.companyName}
              {job.location ? ` · ${job.location}` : ''}
              {job.salaryMin || job.salaryMax
                ? ` · ${formatSalary(job.salaryMin ?? undefined, job.salaryMax ?? undefined)}`
                : ''}
            </p>
          </div>
          <ApplicationStatusBadge status={application.status as ApplicationStatus} />
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: description + application + chat */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-6">
            <h2 className="mb-3 font-semibold">Job Description</h2>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {job.description || 'No description provided.'}
            </p>
          </Card>

          <Card className="p-6">
            <h2 className="mb-3 font-semibold">Your Application</h2>
            <p className="text-xs text-muted-foreground">
              Submitted {new Date(application.appliedAt ?? application.createdAt).toLocaleString()}
            </p>
            <div className="mt-4 rounded-lg border bg-muted/40 p-4">
              <p className="text-xs font-medium text-muted-foreground">Cover letter</p>
              <p className="mt-1 whitespace-pre-wrap text-sm">
                {application.coverLetter || 'No cover letter — applied with your resume.'}
              </p>
            </div>
            {application.resumeUrl ? (
              <Button asChild variant="outline" size="sm" className="mt-3">
                <a href={application.resumeUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-3.5" />
                  View submitted resume
                </a>
              </Button>
            ) : null}
          </Card>

          <Card className="p-6" id="messages">
            <h2 className="mb-3 font-semibold">Messages</h2>
            <div className="h-80">
              <ApplicationChat applicationId={applicationId} />
            </div>
          </Card>
        </div>

        {/* Right: match + timeline + actions */}
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="mb-3 font-semibold">Match Score Breakdown</h2>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Overall</span>
              <span className="text-lg font-bold">{application.matchScore}%</span>
            </div>
            <Progress value={application.matchScore} />

            {Array.isArray(breakdown.skillChecklist) && breakdown.skillChecklist.length > 0 && (
              <ul className="mt-4 space-y-1 text-sm">
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

            {breakdown.cgpaRequired ? (
              <p className="mt-4 text-xs text-muted-foreground">
                CGPA {breakdown.cgpa ?? 'not set'} / required {breakdown.cgpaRequired}{' '}
                {breakdown.meetsCgpa ? '✅' : '❌'}
              </p>
            ) : null}
          </Card>

          <Card className="p-6">
            <h2 className="mb-4 font-semibold">Status Timeline</h2>
            <StatusTimeline steps={timeline} />
          </Card>

          <Card className="p-6">
            <h2 className="mb-3 font-semibold">Actions</h2>
            {canWithdraw ? (
              <Button asChild variant="outline" className="w-full">
                <Link href="/dashboard/applications">Withdraw from the list view</Link>
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                {application.status === 'HIRED'
                  ? 'Congratulations! This application was hired.'
                  : `This application is ${String(application.status).toLowerCase()} — no further action needed.`}
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ApplicationDetailPage;
