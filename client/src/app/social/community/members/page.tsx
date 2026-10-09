'use client';

import { SocialNav, SocialShell } from '@/components/social/SocialNav';
import { UserCard } from '@/components/social/SocialUsers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useCommunityMembers } from '@/hooks/useSocial';
import { useState } from 'react';

/** /social/community/members — community directory. */
export default function CommunityMembersPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const members = useCommunityMembers(page);

  const rows: any[] = (members.data as any)?.communities ?? [];

  const filtered = q
    ? rows.filter((c: any) =>
        c.name?.toLowerCase().includes(q.toLowerCase()) ||
        c.tagName?.toLowerCase().includes(q.toLowerCase())
      )
    : rows;

  return (
    <SocialShell>
      <SocialNav
        title="Community members"
        subtitle="Discover and join communities."
      />

      <div className="mb-4">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search communities…"
          className="max-w-sm"
        />
      </div>

      {members.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No communities found.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c: any) => (
            <div key={c.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">#{c.tagName}</span>
                <span className="text-xs text-muted-foreground">{c.memberCount} members</span>
              </div>
              <p className="mt-2 text-sm font-semibold">{c.name}</p>
              <p className="truncate text-xs text-muted-foreground">{c.description}</p>
              <Button variant="outline" size="sm" className="mt-2">
                Join
              </Button>
            </div>
          ))}
        </div>
      )}
    </SocialShell>
  );
}
