'use client';

import { PostCard } from '@/components/social/PostCard';
import { SocialNav, SocialShell } from '@/components/social/SocialNav';
import { UserCard } from '@/components/social/SocialUsers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useCommunityPosts, useCommunityMembers } from '@/hooks/useSocial';
import { useState } from 'react';

/** /social/community/posts — all posts across communities. */
export default function CommunityPostsPage() {
  const [page, setPage] = useState(1);
  const posts = useCommunityPosts(page);

  const postsData: any[] = (posts.data as any)?.posts ?? [];

  return (
    <SocialShell>
      <SocialNav
        title="Community posts"
        subtitle="Posts shared across all communities."
      />

      <div className="mb-4">
        <Input
          placeholder="Search community posts…"
          className="max-w-sm"
        />
      </div>

      {posts.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : postsData.length === 0 ? (
        <p className="text-sm text-muted-foreground">No community posts yet.</p>
      ) : (
        <div className="space-y-3">
          {postsData.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
          {(posts.data as any)?.pagination?.hasMore && (
            <Button variant="outline" onClick={() => setPage((p) => p + 1)}>
              Load more
            </Button>
          )}
        </div>
      )}
    </SocialShell>
  );
}
