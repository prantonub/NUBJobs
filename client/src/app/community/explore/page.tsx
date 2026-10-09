'use client';

import { PostCard } from '@/components/social/PostCard';
import { SocialNav, SocialShell } from '@/components/social/SocialNav';
import { SuggestionsCard, TrendingCard } from '@/components/social/SocialExtras';
import { UserCard } from '@/components/social/SocialUsers';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useFollowSuggestions, useHashtagPosts, useTrendingFeed, useTrendingHashtags } from '@/hooks/useSocial';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

function ExploreBody() {
  const searchParams = useSearchParams();
  const tag = searchParams.get('tag') ?? '';
  const [page, setPage] = useState(1);

  const trending = useTrendingHashtags(10);
  const popular = useTrendingFeed(1);
  const suggestions = useFollowSuggestions(5);
  const tagged = useHashtagPosts(tag || undefined, page);

  const popularPosts: any[] = (popular.data as any)?.posts ?? [];
  const users: any[] = (suggestions.data as any)?.users ?? [];
  const taggedPosts: any[] = (tagged.data as any)?.posts ?? [];

  return (
    <SocialShell
      right={
        <>
          <TrendingCard limit={10} />
          <SuggestionsCard limit={5} />
        </>
      }
    >
      <SocialNav title="Explore" subtitle="Trending hashtags, popular posts and people to follow." />
      {tag ? (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Posts tagged #{tag}</h2>
          {tagged.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : taggedPosts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing here yet.</p>
          ) : (
            <>
              {taggedPosts.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
              {(tagged.data as any)?.pagination?.hasMore && (
                <Button variant="outline" onClick={() => setPage((p) => p + 1)}>
                  Load more
                </Button>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <section>
            <h2 className="mb-2 text-sm font-semibold">Popular this week</h2>
            {popular.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : popularPosts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No popular posts yet.</p>
            ) : (
              <div className="space-y-3">
                {popularPosts.slice(0, 3).map((p) => (
                  <PostCard key={p.id} post={p} />
                ))}
              </div>
            )}
          </section>
          <section>
            <h2 className="mb-2 text-sm font-semibold">People to follow</h2>
            {suggestions.isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : users.length === 0 ? (
              <p className="text-sm text-muted-foreground">No suggestions right now.</p>
            ) : (
              <div className="space-y-2">
                {users.map((u) => (
                  <UserCard key={u.id} user={u} />
                ))}
              </div>
            )}
          </section>
          {!trending.isLoading && (trending.data as any)?.hashtags?.length === 0 && (
            <p className="text-sm text-muted-foreground">Trending topics will appear here once people start posting.</p>
          )}
        </div>
      )}
    </SocialShell>
  );
}

/** /community/explore — discovery hub (+ ?tag= deep link). */
export default function ExplorePage() {
  return (
    <Suspense fallback={<Skeleton className="h-40 w-full" />}>
      <ExploreBody />
    </Suspense>
  );
}
