"use client";

import Link from 'next/link';
import { AlertTriangleIcon, ArrowRightIcon, BriefcaseBusinessIcon, CheckCircle2Icon, KanbanSquareIcon, ScaleIcon, UsersIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/button';
import AdminRecents from '@/components/admin/AdminRecents';
import { useAdminDashboard } from '@/hooks/useAdmin';

export default function AdminDashboardPage() {
  const { data, isLoading, isError } = useAdminDashboard();
  const overview = data?.overview ?? {};
  const stats = data?.stats ?? {};
  const pendingItems = [
    { label: 'jobs awaiting approval', count: overview.pendingJobs ?? 0, href: '/admin/jobs?status=PENDING' },
    { label: 'verification requests', count: overview.pendingVerifications ?? 0, href: '/admin/companies?tab=pending' },
    { label: 'disputes to resolve', count: overview.openDisputes ?? 0, href: '/admin/disputes?status=OPEN' },
  ];

  if (isLoading) {
    return <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">Loading live dashboard data...</div>;
  }

  if (isError || !data) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        <p className="font-semibold">Live dashboard is unavailable</p>
        <p className="mt-2">The admin API is not responding right now.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Admin Dashboard</p>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Platform control center</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<UsersIcon />} value={overview.totalUsers ?? 0} label="Total Users" color="blue" />
        <StatCard icon={<BriefcaseBusinessIcon />} value={overview.totalJobs ?? 0} label="Total Jobs" color="green" />
        <StatCard icon={<CheckCircle2Icon />} value={overview.totalApplications ?? 0} label="Total Applications" color="purple" />
        <StatCard icon={<CheckCircle2Icon />} value={overview.totalHired ?? 0} label="Hired" color="amber" />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangleIcon className="size-5 text-amber-500" /> Pending actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingItems.map((item) => (
              <Link key={item.label} href={item.href} className="flex items-center justify-between rounded-xl border border-border p-3 transition-colors hover:bg-muted/50">
                <span className="text-sm">
                  <strong className="font-heading text-lg tabular-nums">{item.count}</strong>{' '}
                  <span className="text-muted-foreground">{item.label}</span>
                </span>
                <ArrowRightIcon className="size-4 text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Quick actions</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" asChild>
              <Link href="/admin/jobs?status=PENDING">Review pending jobs</Link>
            </Button>
            <Button className="w-full justify-start" variant="outline" asChild>
              <Link href="/admin/companies">Verify companies</Link>
            </Button>
            <Button className="w-full justify-start" variant="outline" asChild>
              <Link href="/admin/disputes?status=OPEN">Resolve disputes</Link>
            </Button>
            <Button className="w-full justify-start" variant="outline" asChild>
              <Link href="/admin/pipeline"><KanbanSquareIcon className="mr-2 size-4" /> View pipeline</Link>
            </Button>
            <div className="border-t border-border pt-3 text-sm text-muted-foreground">
              <p>New users today: <strong className="text-foreground">{overview.newUsersToday ?? 0}</strong></p>
              <p>New jobs today: <strong className="text-foreground">{overview.newJobsToday ?? 0}</strong></p>
              <p>Avg time to hire: <strong className="text-foreground">{stats.avgTimeToHire ?? '—'}</strong></p>
              <p>Acceptance rate: <strong className="text-foreground">{stats.acceptanceRate ?? '—'}</strong></p>
            </div>
          </CardContent>
        </Card>
      </div>

      <AdminRecents />
    </div>
  );
}
