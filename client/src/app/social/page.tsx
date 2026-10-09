'use client';

import { PostCard } from '@/components/social/PostCard';
import { SocialShell } from '@/components/social/SocialNav';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useFeed } from '@/hooks/useSocial';
import { Suspense, useState } from 'react';

/** /social — home feed. Posts only: no headings, teasers or filler text. */
function HomeFeedBody() {
  const [page, setPage] = useState(1);
  const feed = useFeed(page);

  const posts: any[] = (feed.data as any)?.posts ?? [];
  const hasMore = Boolean((feed.data as any)?.pagination?.hasMore);

  return (
    <SocialShell>
      {feed.isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <Skeleton key={n} className="h-48 w-full" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No posts yet.</p>
      ) : (
        <div className="space-y-4">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
          {hasMore && (
            <Button
              variant="outline"
              className="mt-2 w-full"
              onClick={() => setPage((p) => p + 1)}
              disabled={feed.isFetching}
            >
              Load more
            </Button>
          )}
        </div>
      )}
    </SocialShell>
  );
}

/** /social — home feed. */
export default function HomeFeedPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <HomeFeedBody />
    </Suspense>
  );
}
