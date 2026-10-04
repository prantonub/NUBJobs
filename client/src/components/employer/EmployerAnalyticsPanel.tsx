'use client';

import { useState, type FC } from 'react';
import { useEmployerAnalytics } from '@/hooks/useEmployer';
import { Card } from '@/components/ui/card';
import {
  ApplicationsLineChart,
  JobsLineChart,
  StatusPieChart,
  TopJobsBarChart,
} from '@/components/employer/AnalyticsCharts';

/**
 * Analytics body shared by `/employer/analytics` and the Analytics tab on
 * `/employer/company`: 6 overview cards, 4 metric cards, 4 charts + a
 * per-job performance table.
 */
export const EmployerAnalyticsPanel: FC = () => {
  const { data, isLoading } = useEmployerAnalytics();
  // Spec date filter: window the monthly chart buckets (3 / 6 / 12 months).
  const [rangeMonths, setRangeMonths] = useState('12');

  if (isLoading) {
    return <p className="p-8 text-center text-sm text-muted-foreground">Loading analytics…</p>;
  }

  const overview = data?.overview ?? {};
  const metrics = data?.metrics ?? {};
  const jobsChart = data?.jobsChart ?? [];
  const applicationsChart = data?.applicationsChart ?? [];
  const months = Math.max(1, Number(rangeMonths) || 12);
  const visibleJobsChart = jobsChart.slice(-months);
  const visibleApplicationsChart = applicationsChart.slice(-months);
  const topJobs = data?.topJobs ?? [];
  const statusCounts: Record<string, number> = data?.statusCounts ?? {};

  const pieData = Object.entries(statusCounts).map(([status, count]) => ({ name: status, value: count }));

  const overviewCards = [
    { label: 'Total Jobs', value: overview.totalJobs ?? 0 },
    { label: 'Active Jobs', value: overview.activeJobs ?? 0 },
    { label: 'Applications', value: overview.totalApplications ?? overview.totalApplicants ?? 0 },
    { label: 'Hired', value: overview.hired ?? 0 },
    { label: 'Views (month)', value: overview.viewsThisMonth ?? 0 },
    { label: 'Clicks (month)', value: overview.clicksThisMonth ?? 0 },
  ];

  const metricCards = [
    { label: 'Avg Time to Hire', value: `${metrics.avgTimeToHire ?? 0} days` },
    { label: 'Acceptance Rate', value: `${metrics.acceptanceRate ?? 0}%` },
    { label: 'Views per Job', value: metrics.viewsPerJob ?? 0 },
    { label: 'Click Through Rate', value: `${metrics.clickThroughRate ?? 0}%` },
  ];

  return (
    <div className="space-y-6">
      {/* Date range filter for the time-series charts */}
      <div className="flex items-center justify-end gap-2">
        <label htmlFor="analytics-range" className="text-xs text-muted-foreground">
          Date range
        </label>
        <select
          id="analytics-range"
          value={rangeMonths}
          onChange={(event) => setRangeMonths(event.target.value)}
          className="rounded border bg-background px-2 py-1 text-sm"
        >
          <option value="3">Last 3 months</option>
          <option value="6">Last 6 months</option>
          <option value="12">Last 12 months</option>
        </select>
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
          <JobsLineChart data={visibleJobsChart} />
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 font-semibold">Applications per Month</h2>
          <ApplicationsLineChart data={visibleApplicationsChart} />
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 font-semibold">Applications by Status</h2>
          {pieData.length === 0 ? (
            <p className="text-sm text-muted-foreground">No applications yet.</p>
          ) : (
            <StatusPieChart data={pieData} />
          )}
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 font-semibold">Top Performing Jobs</h2>
          {topJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No jobs yet.</p>
          ) : (
            <TopJobsBarChart data={topJobs} />
          )}

          <table className="mt-4 w-full text-xs">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-1">Job</th>
                <th className="py-1 text-right">Applicants</th>
                <th className="py-1 text-right">Views</th>
              </tr>
            </thead>
            <tbody>
              {topJobs.slice(0, 5).map((job: { id: string; title: string; applicants: number; views: number }) => (
                <tr key={job.id} className="border-t">
                  <td className="max-w-[220px] truncate py-1">{job.title}</td>
                  <td className="py-1 text-right">{job.applicants}</td>
                  <td className="py-1 text-right">{job.views}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
};

export default EmployerAnalyticsPanel;
