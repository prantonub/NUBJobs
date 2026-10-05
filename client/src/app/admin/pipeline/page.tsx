"use client";

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { useAdminCompanies, useAdminPipeline } from '@/hooks/useAdmin';

const COLUMNS = [
  { key: 'applied', label: 'APPLIED', accent: 'text-blue-600' },
  { key: 'reviewed', label: 'REVIEWED', accent: 'text-purple-600' },
  { key: 'shortlisted', label: 'SHORTLISTED', accent: 'text-emerald-600' },
  { key: 'interviewed', label: 'INTERVIEWED', accent: 'text-orange-600' },
  { key: 'hired', label: 'HIRED', accent: 'text-emerald-700' },
  { key: 'rejected', label: 'REJECTED', accent: 'text-red-600' },
] as const;

const daysAgo = (v: string) => (Date.now() - new Date(v).getTime()) / 86400000;

/** Read-only kanban across the whole platform (admin has no drag rights per spec §5). */
export default function AdminPipelinePage() {
  const [companyId, setCompanyId] = useState('ALL');
  const [range, setRange] = useState('ALL');
  const { data, isLoading } = useAdminPipeline(companyId === 'ALL' ? {} : { companyId });
  const { data: companiesData } = useAdminCompanies({ limit: 100 });

  const filter = (cards: any[] = []) =>
    cards.filter((c) => range === 'ALL' || daysAgo(c.appliedAt) <= Number(range));

  const counts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const col of COLUMNS) out[col.key] = filter(data?.[col.key]).length;
    return out;
  }, [data, range]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Application Pipeline</h1>
          <p className="text-sm text-muted-foreground">Platform-wide kanban, read-only. Click a card to inspect it.</p>
        </div>
        <div className="flex gap-2">
          <select className="rounded-md border px-3 py-2 text-sm" aria-label="Filter by company" value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
            <option value="ALL">All companies</option>
            {(companiesData?.companies ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="rounded-md border px-3 py-2 text-sm" aria-label="Date range" value={range} onChange={(e) => setRange(e.target.value)}>
            <option value="ALL">All time</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">Loading pipeline...</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          {COLUMNS.map((col) => {
            const cards = filter(data?.[col.key]);
            return (
              <Card key={col.key} className="flex flex-col">
                <CardHeader className="pb-2">
                  <CardTitle className={`text-sm ${col.accent}`}>
                    {col.label} <span className="tabular-nums">({counts[col.key]})</span>
                  </CardTitle>
                </CardHeader>
                <div className="max-h-[60vh] space-y-2 overflow-y-auto px-3 pb-3">
                  {cards.length === 0 && <p className="text-xs text-muted-foreground">Empty</p>}
                  {cards.map((c: any) => (
                    <Link
                      key={c.id}
                      href={`/admin/applications/${c.id}`}
                      className="block rounded-lg border border-border bg-card p-2 text-sm transition-colors hover:border-foreground/30"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <p className="truncate font-medium">{c.studentName}</p>
                        <span className="shrink-0 text-xs font-semibold text-emerald-600">{c.matchScore}%</span>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{c.jobTitle}</p>
                      <p className="truncate text-xs text-muted-foreground">{c.company}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {(c.skills ?? []).slice(0, 3).map((s: string) => (
                          <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                        ))}
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        CGPA {c.cgpa ?? '—'} · {new Date(c.appliedAt).toLocaleDateString()}
                      </p>
                    </Link>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
