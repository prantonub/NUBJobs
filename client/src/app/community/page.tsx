'use client';

import { PostCard } from '@/components/social/PostCard';
import { PostComposerTeaser } from '@/components/social/PostComposer';
import { SocialNav, SocialShell } from '@/components/social/SocialNav';
import { SuggestionsCard, TrendingCard } from '@/components/social/SocialExtras';
import { UserAvatar, type SocialUser } from '@/components/social/SocialUsers';
import { useFeed, useSocialSocket, useTrendingFeed } from '@/hooks/useSocial';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

function SkeletonFeed() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-36 w-full" />
      ))}
    </div>
  );
}

function FeedList({
  posts,
  hasMore,
  isFetching,
  onLoadMore,
}: {
  posts: any[];
  hasMore: boolean;
  isFetching: boolean;
  onLoadMore: () => void;
}) {
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetching) onLoadMore();
      },
      { rootMargin: '400px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, isFetching, onLoadMore]);

  return (
    <div className="space-y-3">
      {posts.map((p) => (
        <PostCard key={p.id} post={p} />
      ))}
      {isFetching && <Skeleton className="h-28 w-full" />}
      <div ref={sentinel} />
      {!hasMore && posts.length > 0 && (
        <p className="py-4 text-center text-xs text-muted-foreground">You are all caught up</p>
      )}
    </div>
  );
}

/** /community — Home feed redesign (professional networking timeline). */
export default function CommunityHomePage() {
  useSocialSocket();
  const { user } = useAuth();
  const [tab, setTab] = useState<'home' | 'trending'>('home');
  const [page, setPage] = useState(1);

  useEffect(() => setPage(1), [tab]);
  const feed = useFeed(page);
  const trending = useTrendingFeed(page);
  const query = tab === 'home' ? feed : trending;

  const posts: any[] = (query.data as any)?.posts ?? [];
  const pagination = (query.data as any)?.pagination;
  const hasMore = Boolean(pagination?.hasMore);
  const [accumulated, setAccumulated] = useState<any[]>([]);

  useEffect(() => {
    if (!posts.length) return;
    setAccumulated((prev) => {
      if (page === 1) return posts;
      const ids = new Set(prev.map((p) => p.id));
      return [...prev, ...posts.filter((p) => !ids.has(p.id))];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.dataUpdatedAt]);

  const meUser: SocialUser | null = user
    ? {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        photo: user.avatar ?? user.photoUrl ?? null,
      }
    : null;

  return (
    <SocialShell
      right={
        <>
          {meUser && (
            <section className="rounded-lg border border-border bg-card p-4">
              <Link
                href={meUser.username ? `/community/${meUser.username}` : '/community'}
                className="flex items-center gap-3"
              >
                <UserAvatar user={meUser} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{meUser.name}</p>
                  <p className="truncate text-xs text-muted-foreground">@{meUser.username ?? '…'}</p>
                </div>
              </Link>
            </section>
          )}
          <TrendingCard limit={5} />
          <SuggestionsCard limit={5} />
        </>
      }
    >
      <SocialNav title="Home" subtitle="Tips, wins and questions from people you follow." />
      <div className="mb-4 flex items-center gap-2">
        <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
          {(['home', 'trending'] as const).map((t) => (
            <Button
              key={t}
              size="sm"
              variant="ghost"
              onClick={() => setTab(t)}
              className={cn(
                'capitalize',
                tab === t && 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground'
              )}
            >
              {t === 'home' ? 'Following' : 'Trending'}
            </Button>
          ))}
        </div>
        <Link href="/community/post/new" className="ml-auto">
          <Button size="sm">+ New post</Button>
        </Link>
      </div>

      {page === 1 && (
        <div className="mb-3">
          <PostComposerTeaser />
        </div>
      )}

      {query.isLoading ? (
        <SkeletonFeed />
      ) : query.isError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
          Couldn&apos;t load the feed. Please try again.
        </p>
      ) : accumulated.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card px-6 py-12 text-center">
          <p className="text-sm font-medium">Your feed is quiet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {tab === 'home'
              ? 'Follow people or share your first post to get started.'
              : 'No trending posts this week yet.'}
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Link href="/community/post/new">
              <Button>Share a post</Button>
            </Link>
            <Link href="/community/explore">
              <Button variant="outline">Explore</Button>
            </Link>
          </div>
        </div>
      ) : (
        <FeedList
          posts={accumulated}
          hasMore={hasMore}
          isFetching={query.isFetching}
          onLoadMore={() => setPage((p) => p + 1)}
        />
      )}
    </SocialShell>
  );
}
