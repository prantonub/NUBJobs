'use client';

import { type FC, useState } from 'react';
import Link from 'next/link';
import { useEmployerCompany, useEmployerJobs, useVerificationStatus } from '@/hooks/useEmployer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { CompanyInfoCard } from '@/components/employer/CompanyInfoCard';

/**
 * Overview tab of `/employer/company`: company header card, about, contact and
 * social links, stats and the latest postings/activity.
 */
export const CompanyOverviewTab: FC = () => {
  const { data: profile } = useEmployerCompany();
  const { data: verification } = useVerificationStatus();
  const { data: jobsData } = useEmployerJobs({ limit: 5 });
  const [showLogoUploader, setShowLogoUploader] = useState(false);

  const jobs = jobsData?.data ?? [];
  const recentJobs = jobs.slice(0, 5);

  return (
    <div className="space-y-6">
      <CompanyInfoCard
        profile={profile}
        verificationStatus={verification}
        onLogoClick={() => setShowLogoUploader((open) => !open)}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">About company</h2>
              <Button size="sm" variant="outline" asChild>
                <Link href="/employer/company?tab=settings">Edit</Link>
              </Button>
            </div>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {profile?.about || 'No description yet — add one so candidates know who you are.'}
            </p>
          </Card>

          <Card className="p-6">
            <h2 className="mb-3 font-semibold">Recent jobs</h2>
            {recentJobs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No jobs yet.{' '}
                <Link href="/employer/post-job" className="text-primary hover:underline">
                  Post your first job
                </Link>
              </p>
            ) : (
              <ul className="divide-y">
                {recentJobs.map((job: any) => (
                  <li key={job.id} className="flex items-center justify-between gap-3 py-2">
                    <Link href={`/employer/jobs/${job.id}`} className="truncate text-sm hover:underline">
                      {job.title}
                    </Link>
                    <span className="flex items-center gap-3 text-xs text-muted-foreground">
                      {job._count?.applications ?? 0} applicants
                      <StatusBadge status={job.status} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="mb-3 font-semibold">Contact</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Email</dt>
                <dd className="truncate">{profile?.email || '—'}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Phone</dt>
                <dd>{profile?.phone || '—'}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Location</dt>
                <dd>{profile?.location || '—'}</dd>
              </div>
              {profile?.website ? (
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Website</dt>
                  <dd>
                    <a
                      href={profile.website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      Visit
                    </a>
                  </dd>
                </div>
              ) : null}
            </dl>
          </Card>

          <Card className="p-6">
            <h2 className="mb-3 font-semibold">Social links</h2>
            <ul className="space-y-2 text-sm">
              {[
                { label: 'LinkedIn', href: profile?.linkedinUrl },
                { label: 'Twitter', href: profile?.twitterUrl },
                { label: 'Facebook', href: profile?.facebookUrl },
              ].map((social) => (
                <li key={social.label} className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{social.label}</span>
                  {social.href ? (
                    <a
                      href={social.href}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-primary hover:underline"
                    >
                      {social.href.replace(/^https?:\/\//, '').slice(0, 28)}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">Not set</span>
                  )}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-6">
            <h2 className="mb-3 font-semibold">Activity</h2>
            <ul className="space-y-2 text-xs text-muted-foreground">
              {recentJobs.map((job: any) => (
                <li key={job.id}>
                  You posted “{job.title}” ·{' '}
                  {new Date(job.postedAt ?? job.createdAt).toLocaleDateString()}
                </li>
              ))}
              {recentJobs.length === 0 && <li>No activity yet.</li>}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CompanyOverviewTab;