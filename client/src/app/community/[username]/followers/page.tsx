'use client';

import { SocialNav, SocialShell } from '@/components/social/SocialNav';
import { UserCard } from '@/components/social/SocialUsers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useFollowers } from '@/hooks/useSocial';
import { use, useState } from 'react';

/** /community/:username/followers — follower list with search. */
export default function FollowersPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const query = useFollowers(username, page);

  const rows: any[] = ((query.data as any)?.followers ?? []).filter(
    (u: any) => !q || u.name?.toLowerCase().includes(q.toLowerCase()) || u.username?.includes(q.toLowerCase())
  );

  return (
    <SocialShell>
      <SocialNav title={`Followers of @${username}`} />
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search followers…"
        className="mb-3 max-w-sm"
      />
      {query.isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No followers found.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((u) => (
            <UserCard key={u.id} user={u} />
          ))}
        </div>
      )}
      {(query.data as any)?.pagination?.hasMore && (
        <Button variant="outline" className="mt-3" onClick={() => setPage((p) => p + 1)}>
          Load more
        </Button>
      )}
    </SocialShell>
  );
}
