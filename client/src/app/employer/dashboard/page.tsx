'use client';

import { type FC } from 'react';
import Link from 'next/link';
import {
  useCompanyProfile,
  useEmployerApplicationsList,
  useEmployerJobs,
  useEmployerStats,
  useVerificationStatus,
} from '@/hooks/useEmployer';
import { useApplicationRealtime } from '@/hooks/useApplicationRealtime';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ApplicationStatusBadge, type ApplicationStatus } from '@/components/ui/ApplicationStatusBadge';
import { CompanyInfoCard } from '@/components/employer/CompanyInfoCard';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Briefcase, Eye, TrendingUp, Users } from 'lucide-react';

/**
 * /employer/dashboard — company header, 4 KPI cards, the pipeline chart, the
 * latest postings/applicants, quick actions and an activity feed.
 * Every number comes from employer-scoped endpoints, so it only ever reflects
 * the signed-in company's own data.
 */
const EmployerDashboardPage: FC = () => {
  const { data: stats } = useEmployerStats();
  const { data: company } = useCompanyProfile();
  const { data: verification } = useVerificationStatus();
  const { data: jobsData } = useEmployerJobs({ limit: 5 });
  const { data: applicationsData } = useEmployerApplicationsList({ limit: 5 });

  // Live counters: refreshes on `new_application` / `application_status_changed`.
  useApplicationRealtime('EMPLOYER');

  const recentJobs = jobsData?.data ?? [];
  const recentApplications = applicationsData?.data ?? [];

  const chartData = [
    { name: 'Applied', count: stats?.statusCounts?.APPLIED ?? 0 },
    { name: 'Reviewed', count: stats?.statusCounts?.REVIEWED ?? 0 },
    { name: 'Shortlisted', count: stats?.statusCounts?.SHORTLISTED ?? 0 },
    { name: 'Interviewed', count: stats?.statusCounts?.INTERVIEWED ?? 0 },
    { name: 'Hired', count: stats?.statusCounts?.HIRED ?? 0 },
  ];

  const statCards = [
    { label: 'Total Jobs Posted', value: stats?.totalJobs ?? 0, icon: Briefcase, color: 'bg-blue-500' },
    { label: 'Total Applications', value: stats?.totalApplications ?? 0, icon: Users, color: 'bg-purple-500' },
    { label: 'Hired Candidates', value: stats?.statusCounts?.HIRED ?? 0, icon: TrendingUp, color: 'bg-green-500' },
    { label: 'Active Jobs', value: stats?.activeJobs ?? 0, icon: Eye, color: 'bg-orange-500' },
  ];

  return (
    <div className="space-y-6">
      <CompanyInfoCard profile={company} verificationStatus={verification} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="p-5">
              <div className={`${card.color} mb-4 inline-flex rounded-lg p-2.5 text-white`}>
                <Icon className="size-5" />
              </div>
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <p className="mt-1 text-3xl font-bold">{card.value}</p>
            </Card>
          );
        })}
      </div>

      <Card className="p-6">
        <h2 className="mb-4 font-semibold">Applications Pipeline</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="#667eea" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Recent Jobs</h2>
            <Button variant="outline" size="sm" asChild>
              <Link href="/employer/jobs">View All Jobs</Link>
            </Button>
          </div>

          {recentJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No jobs yet.{' '}
              <Link href="/employer/post-job" className="text-primary hover:underline">
                Post your first job
              </Link>
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left">
                  <tr>
                    <th className="py-2 font-medium">Job Title</th>
                    <th className="py-2 font-medium">Applications</th>
                    <th className="py-2 font-medium">Status</th>
                    <th className="py-2 font-medium">Posted</th>
                  </tr>
                </thead>
                <tbody>
                  {recentJobs.map((job: any) => (
                    <tr key={job.id} className="border-b last:border-0">
                      <td className="py-2">
                        <Link href={`/employer/jobs/${job.id}`} className="text-primary hover:underline">
                          {job.title}
                        </Link>
                      </td>
                      <td className="py-2">{job._count?.applications ?? 0}</td>
                      <td className="py-2">
                        <StatusBadge status={job.status} />
                      </td>
                      <td className="py-2 text-muted-foreground">
                        {new Date(job.postedAt ?? job.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Recent Applications</h3>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/employer/applications">All</Link>
            </Button>
          </div>
          {recentApplications.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No applicants yet</p>
          ) : (
            <div className="space-y-2">
              {recentApplications.map((application: any) => (
                <Link key={application.id} href={`/employer/applications/${application.id}`}>
                  <div className="rounded-lg bg-muted/50 p-3 transition hover:bg-muted">
                    <p className="truncate text-sm font-medium">
                      {application.studentName ?? application.student?.user?.name ?? 'Candidate'}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {application.jobTitle ?? application.job?.title}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <ApplicationStatusBadge status={application.status as ApplicationStatus} />
                      <span className="text-xs text-muted-foreground">{application.matchScore}% match</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <h2 className="mb-3 font-semibold">Quick Actions</h2>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/employer/post-job">Post New Job</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/employer/jobs">View All Jobs</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/employer/pipeline">View Pipeline</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/employer/applications">View Applications</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/employer/analytics">Analytics</Link>
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-3 font-semibold">Activity</h2>
          <ul className="space-y-2 text-xs text-muted-foreground">
            {recentJobs.slice(0, 5).map((job: any) => (
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
  );
};

export default EmployerDashboardPage;
