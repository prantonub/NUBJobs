"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/ui/StatCard';
import { useAdminAnalytics } from '@/hooks/useAdmin';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BriefcaseBusinessIcon, CheckCircle2Icon, TrendingUpIcon, UsersIcon } from 'lucide-react';

const RANGES = [
  { label: 'Last 30 days', value: 30 },
  { label: 'Last 90 days', value: 90 },
  { label: 'Last year', value: 365 },
];
const FUNNEL_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#22c55e', '#ef4444'];

export default function AdminAnalyticsPage() {
  const [range, setRange] = useState(30);
  const { data, isLoading } = useAdminAnalytics(range);

  if (isLoading) {
    return <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">Loading platform analytics...</div>;
  }
  if (!data) {
    return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">Analytics unavailable.</div>;
  }

  const users = data.users ?? {};
  const jobs = data.jobs ?? {};
  const apps = data.applications ?? {};
  const charts = data.charts ?? {};
  const funnel = charts.applicationFunnel ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Platform Analytics</h1>
          <p className="text-sm text-muted-foreground">Growth, jobs, applications and top performers.</p>
        </div>
        <div className="flex gap-2">
          {RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRange(r.value)}
              className={`rounded-md border px-3 py-1.5 text-sm ${range === r.value ? 'bg-foreground text-background' : 'hover:bg-muted'}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Section 1 — users */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={<UsersIcon />} value={users.total ?? 0} label="Total users" color="blue" />
        <StatCard icon={<UsersIcon />} value={users.students ?? 0} label="Students" color="green" />
        <StatCard icon={<UsersIcon />} value={users.employers ?? 0} label="Employers" color="purple" />
        <StatCard icon={<TrendingUpIcon />} value={`${users.growth ?? 0}%`} label={`Growth (${range}d)`} color="amber" />
        <StatCard icon={<UsersIcon />} value={users.monthlyActive ?? 0} label="Active users" color="blue" />
      </div>

      {/* Section 2 — jobs & applications */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={<BriefcaseBusinessIcon />} value={jobs.total ?? 0} label="Total jobs" color="blue" />
        <StatCard icon={<BriefcaseBusinessIcon />} value={jobs.active ?? 0} label="Active jobs" color="green" />
        <StatCard icon={<BriefcaseBusinessIcon />} value={jobs.posted ?? 0} label={`Posted (${range}d)`} color="purple" />
        <StatCard icon={<CheckCircle2Icon />} value={apps.total ?? 0} label="Applications" color="amber" />
        <StatCard icon={<CheckCircle2Icon />} value={apps.acceptanceRate ?? '0%'} label="Acceptance rate" color="green" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>User growth</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.userGrowth ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Job posting trend</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.jobTrends ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Applications by status (funnel)</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={funnel} dataKey="count" nameKey="status" outerRadius={90} label>
                  {funnel.map((entry: any, index: number) => (
                    <Cell key={entry.status} fill={FUNNEL_COLORS[index % FUNNEL_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Top 10 jobs by applicants</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.topJobs ?? []} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="title" width={130} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="applicants" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Jobs by category</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={jobs.categoryBreakdown ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="category" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Most active employers</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="p-2">Company</th>
                  <th className="p-2">Jobs posted</th>
                </tr>
              </thead>
              <tbody>
                {(charts.topEmployers ?? []).map((e: any, i: number) => (
                  <tr key={`${e.company}-${i}`} className="border-b last:border-0">
                    <td className="p-2 font-medium">{e.company}</td>
                    <td className="p-2 tabular-nums">{e.jobs}</td>
                  </tr>
                ))}
                {(charts.topEmployers ?? []).length === 0 && (
                  <tr><td colSpan={2} className="p-2 text-muted-foreground">No data.</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

