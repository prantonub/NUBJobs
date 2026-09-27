'use client';

import { FC } from 'react';
import { useCompanyAnalytics } from '@/hooks/useEmployer';
import { Card } from '@/components/ui/card';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const STATUS_COLORS: Record<string, string> = {
  APPLIED: '#6366f1',
  REVIEWED: '#8b5cf6',
  SHORTLISTED: '#f59e0b',
  INTERVIEWED: '#f97316',
  HIRED: '#22c55e',
  REJECTED: '#ef4444',
  WITHDRAWN: '#94a3b8',
};

/** /employer/analytics — charts + hiring metrics for the company. */
const EmployerAnalyticsPage: FC = () => {
  const { data, isLoading } = useCompanyAnalytics();

  if (isLoading) {
    return <p className="p-8 text-center text-sm text-muted-foreground">Loading analytics…</p>;
  }

  const overview = data?.overview ?? {};
  const metrics = data?.metrics ?? {};
  const jobsChart = data?.jobsChart ?? [];
  const applicationsChart = data?.applicationsChart ?? [];
  const topJobs = data?.topJobs ?? [];
  const statusCounts: Record<string, number> = data?.statusCounts ?? {};

  const pieData = Object.entries(statusCounts).map(([status, count]) => ({ name: status, value: count }));

  const metricCards = [
    { label: 'Avg Time to Hire', value: `${metrics.avgTimeToHire ?? 0} days` },
    { label: 'Acceptance Rate', value: `${metrics.acceptanceRate ?? 0}%` },
    { label: 'Views per Job', value: metrics.viewsPerJob ?? 0 },
    { label: 'Click Through Rate', value: `${metrics.clickThroughRate ?? 0}%` },
  ];

  const overviewCards = [
    { label: 'Total Jobs', value: overview.totalJobs ?? 0 },
    { label: 'Active Jobs', value: overview.activeJobs ?? 0 },
    { label: 'Applicants', value: overview.totalApplicants ?? 0 },
    { label: 'Hired', value: overview.hired ?? 0 },
    { label: 'Views (month)', value: overview.viewsThisMonth ?? 0 },
    { label: 'Clicks (month)', value: overview.clicksThisMonth ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          {data?.company?.name ?? 'Your company'} · hiring performance over the last 6 months.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {overviewCards.map((card) => (
          <Card key={card.label} className="p-4">
            <p className="text-xs text-muted-foreground">{card.label}</p>
            <p className="mt-1 text-2xl font-bold">{card.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metricCards.map((card) => (
          <Card key={card.label} className="p-4">
            <p className="text-xs text-muted-foreground">{card.label}</p>
            <p className="mt-1 text-xl font-semibold">{card.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-4 font-semibold">Jobs Posted Over Time</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={jobsChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="posted" stroke="#667eea" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 font-semibold">Applications per Month</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={applicationsChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#22c55e" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 font-semibold">Applications by Status</h2>
          {pieData.length === 0 ? (
            <p className="text-sm text-muted-foreground">No applications yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={90} label>
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? '#94a3b8'} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 font-semibold">Top Performing Jobs</h2>
          {topJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No jobs yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={topJobs}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="title" hide />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="applicants" fill="#667eea" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
          <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
            {topJobs
              .slice(0, 5)
              .map((job: { id: string; title: string; applicants: number; views: number }) => (
                <li key={job.id} className="flex justify-between gap-2">
                  <span className="truncate">{job.title}</span>
                  <span>
                    {job.applicants} applicants · {job.views} views
                  </span>
                </li>
              ))}
          </ul>
        </Card>
      </div>
    </div>
  );
};

export default EmployerAnalyticsPage;
