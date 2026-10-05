"use client";

import Link from 'next/link';
import { ScaleIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAdminDashboard } from '@/hooks/useAdmin';

export default function AdminRecentsPage() {
  const { data } = useAdminDashboard();
  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <Card>
        <CardHeader><CardTitle>Recent jobs</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {(data?.recentJobs ?? []).map((j: any) => (
            <div key={j.id} className="flex items-center justify-between gap-2 border-b border-border pb-2 last:border-0">
              <span className="truncate font-medium">{j.title} <span className="text-muted-foreground">· {j.employer}</span></span>
              <span className="shrink-0 text-xs text-muted-foreground">{j.status}</span>
            </div>
          ))}
          {(data?.recentJobs ?? []).length === 0 && <p className="text-muted-foreground">No jobs yet.</p>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Recent applications</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {(data?.recentApplications ?? []).map((a: any) => (
            <div key={a.id} className="flex items-center justify-between gap-2 border-b border-border pb-2 last:border-0">
              <span className="truncate font-medium">{a.student} <span className="text-muted-foreground">· {a.job}</span></span>
              <span className="shrink-0 text-xs text-muted-foreground">{a.status}</span>
            </div>
          ))}
          {(data?.recentApplications ?? []).length === 0 && <p className="text-muted-foreground">No applications yet.</p>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><ScaleIcon className="size-4" /> Recent disputes</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {(data?.recentDisputes ?? []).map((d: any) => (
            <Link key={d.id} href={`/admin/disputes/${d.id}`} className="flex items-center justify-between gap-2 border-b border-border pb-2 last:border-0 hover:underline">
              <span className="truncate font-medium">{d.type}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{d.status}</span>
            </Link>
          ))}
          {(data?.recentDisputes ?? []).length === 0 && <p className="text-muted-foreground">No disputes. All quiet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
