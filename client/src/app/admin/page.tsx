"use client";

import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  CheckCircle2,
  Database,
  UserCog,
  Users,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { adminApi } from '@/lib/api/admin.api';

const statMeta = [
  { label: 'Total Users', icon: Users },
  { label: 'Jobs Posted', icon: BriefcaseBusiness },
  { label: 'Applications', icon: UserCog },
  { label: 'Verified Employers', icon: CheckCircle2 },
] as const;

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [database, setDatabase] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const [statsRes, analyticsRes, databaseRes] = await Promise.allSettled([
          adminApi.stats(),
          adminApi.analytics(),
          adminApi.database(),
        ]);

        if (!active) return;

        if (
          statsRes.status === 'rejected' ||
          analyticsRes.status === 'rejected' ||
          databaseRes.status === 'rejected'
        ) {
          setError('The database overview is available, but the live API is not responding right now.');
          setStats(null);
          setAnalytics(null);
          setDatabase(null);
          return;
        }

        setStats(statsRes.value.data?.data ?? null);
        setAnalytics(analyticsRes.value.data?.data ?? null);
        setDatabase(databaseRes.value.data?.data ?? null);
      } catch {
        if (active) setError('Unable to load the database overview right now.');
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  const statCards = useMemo(() => {
    if (!stats) return [];

    return [
      { label: 'Total Users', value: stats.totalUsers ?? 0, change: '+12.5%' },
      { label: 'Jobs Posted', value: (stats.activeJobs ?? 0) + (stats.pendingJobs ?? 0), change: '+8.2%' },
      { label: 'Applications', value: stats.totalApplications ?? 0, change: '+18.4%' },
      { label: 'Verified Employers', value: stats.verifiedEmployers ?? 0, change: '+5.1%' },
    ];
  }, [stats]);

  const lineData = analytics?.applicationsByMonth ?? [];
  const barData = (analytics?.jobsByCategory ?? []).slice(0, 6).map((item: any) => ({
    name: item.category,
    value: item.count,
  }));

  if (loading) {
    return <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">Loading live dashboard data...</div>;
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        <p className="font-semibold">Live dashboard is unavailable</p>
        <p className="mt-2">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Operations overview</p>
          <h2 className="mt-1 text-2xl font-bold text-foreground">Platform health dashboard</h2>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground">
          <span className="size-2 rounded-full bg-emerald-500" />
          Live sync active
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map(({ label, value, change }, index) => {
          const Icon = statMeta[index]?.icon ?? Users;
          return (
            <div key={label} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <h3 className="mt-2 text-3xl font-bold text-foreground">{value}</h3>
                </div>
                <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm text-emerald-600">
                <ArrowUpRight className="h-4 w-4" />
                {change}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Applications overview</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Activity className="h-4 w-4" />
              Last 12 months
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData.length ? lineData : [{ month: 'No data', count: 0 }] }>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Jobs by category</h2>
            <BriefcaseBusiness className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData.length ? barData : [{ name: 'No data', value: 0 }] }>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Live database records</h2>
              <p className="text-sm text-muted-foreground">Direct view of the application data model</p>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
              <Database className="h-3.5 w-3.5" />
              Synced
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-border p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-semibold text-foreground">Users</p>
                <span className="text-xs text-muted-foreground">{database?.users?.total ?? 0}</span>
              </div>
              <div className="max-h-72 overflow-auto text-xs">
                <table className="w-full text-left">
                  <thead><tr className="border-b border-border text-muted-foreground"><th className="p-1">Name</th><th className="p-1">Role</th></tr></thead>
                  <tbody>
                    {(database?.users?.rows ?? []).map((row: any) => (
                      <tr key={row.id} className="border-b border-border last:border-0">
                        <td className="p-1">{row.name}</td>
                        <td className="p-1">{row.role}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-xl border border-border p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-semibold text-foreground">Jobs</p>
                <span className="text-xs text-muted-foreground">{database?.jobs?.total ?? 0}</span>
              </div>
              <div className="max-h-72 overflow-auto text-xs">
                <table className="w-full text-left">
                  <thead><tr className="border-b border-border text-muted-foreground"><th className="p-1">Title</th><th className="p-1">Status</th></tr></thead>
                  <tbody>
                    {(database?.jobs?.rows ?? []).map((row: any) => (
                      <tr key={row.id} className="border-b border-border last:border-0">
                        <td className="p-1">{row.title}</td>
                        <td className="p-1">{row.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-xl border border-border p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-semibold text-foreground">Employers</p>
                <span className="text-xs text-muted-foreground">{database?.employers?.total ?? 0}</span>
              </div>
              <div className="max-h-72 overflow-auto text-xs">
                <table className="w-full text-left">
                  <thead><tr className="border-b border-border text-muted-foreground"><th className="p-1">Company</th><th className="p-1">Verified</th></tr></thead>
                  <tbody>
                    {(database?.employers?.rows ?? []).map((row: any) => (
                      <tr key={row.id} className="border-b border-border last:border-0">
                        <td className="p-1">{row.companyName}</td>
                        <td className="p-1">{row.isVerified ? 'Yes' : 'No'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-xl border border-border p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-semibold text-foreground">Applications</p>
                <span className="text-xs text-muted-foreground">{database?.applications?.total ?? 0}</span>
              </div>
              <div className="max-h-72 overflow-auto text-xs">
                <table className="w-full text-left">
                  <thead><tr className="border-b border-border text-muted-foreground"><th className="p-1">Job</th><th className="p-1">Status</th></tr></thead>
                  <tbody>
                    {(database?.applications?.rows ?? []).map((row: any) => (
                      <tr key={row.id} className="border-b border-border last:border-0">
                        <td className="p-1">{row.jobTitle}</td>
                        <td className="p-1">{row.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Quick actions</h2>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="space-y-3">
              <div className="rounded-xl border border-border p-3">
                <p className="font-medium text-foreground">Review new job postings</p>
                <p className="mt-1 text-sm text-muted-foreground">{stats?.pendingJobs ?? 0} jobs waiting for review</p>
              </div>
              <div className="rounded-xl border border-border p-3">
                <p className="font-medium text-foreground">Approve employer accounts</p>
                <p className="mt-1 text-sm text-muted-foreground">{stats?.verifiedEmployers ?? 0} verified companies</p>
              </div>
              <div className="rounded-xl border border-border p-3">
                <p className="font-medium text-foreground">Monitor engagement</p>
                <p className="mt-1 text-sm text-muted-foreground">{stats?.totalMessages ?? 0} messages exchanged</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground">Platform snapshot</h2>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center justify-between rounded-xl border border-border p-3">
                <span>Active jobs</span>
                <strong className="text-foreground">{stats?.activeJobs ?? 0}</strong>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border p-3">
                <span>Pending jobs</span>
                <strong className="text-foreground">{stats?.pendingJobs ?? 0}</strong>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border p-3">
                <span>Messages</span>
                <strong className="text-foreground">{stats?.totalMessages ?? 0}</strong>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border p-3">
                <span>Interviews</span>
                <strong className="text-foreground">{stats?.interviewCount ?? 0}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
