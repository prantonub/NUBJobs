'use client';

import { PostCard } from '@/components/social/PostCard';
import { SocialShell } from '@/components/social/SocialNav';
import { UserCard } from '@/components/social/SocialUsers';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useCommunityAnnouncements,
  useCommunityPosts,
  useFollowSuggestions,
  useTrendingHashtags,
} from '@/hooks/useSocial';
import { MegaphoneIcon, PlusIcon, UsersIcon } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

/**
 * /social/community â€” Twitter-style layout:
 * top navbar (root layout, always visible) + left sidebar (social layout)
 * + main feed center (posts) + right sidebar (trending, suggested users).
 * All shadcn/ui components â€” no custom CSS.
 */
export default function CommunityHubPage() {
  const [page, setPage] = useState(1);
  const posts = useCommunityPosts(page);
  const announcements = useCommunityAnnouncements(1);
  const trending = useTrendingHashtags(10);
  const suggestions = useFollowSuggestions(5);

  const postsData: any[] = (posts.data as any)?.posts ?? [];
  const announcementsData: any[] = (announcements.data as any)?.announcements ?? [];
  const trendingData: any[] = (trending.data as any)?.hashtags ?? [];
  const suggestedUsers: any[] = (suggestions.data as any)?.users ?? [];
  const hasMore = Boolean((posts.data as any)?.pagination?.hasMore);

  /** Right sidebar â€” trending hashtags + suggested users. */
  const rightSidebar = (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Trending hashtags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {trending.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : trendingData.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hashtags yet â€” be the first to post one.
            </p>
          ) : (
            trendingData.slice(0, 10).map((h: any) => (
              <Link
                key={h.name}
                href={`/social/explore?tag=${encodeURIComponent(h.name)}`}
                className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm font-medium hover:bg-muted"
              >
                <span className="truncate">#{h.name}</span>
                <Badge variant="secondary">{h.postCount}</Badge>
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Who to follow</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {suggestions.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : suggestedUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No suggestions right now.</p>
          ) : (
            suggestedUsers.map((u) => <UserCard key={u.id} user={u} compact />)
          )}
        </CardContent>
      </Card>
    </>
  );

  return (
    <SocialShell right={rightSidebar}>
      {/* Main feed center — Twitter style */}
      <div className="sticky top-16 z-10 -mx-4 mb-4 flex items-center justify-between gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur">
        <div className="min-w-0">
          <h1 className="text-xl font-bold">Community</h1>
          <p className="truncate text-sm text-muted-foreground">
            Discover groups, trending hashtags and community announcements.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link href="/social/community/members">
            <Button variant="outline" size="sm">
              <UsersIcon className="size-4" />
              Members
            </Button>
          </Link>
          <Link href="/social/post/new">
            <Button size="sm">
              <PlusIcon className="size-4" />
              New Post
            </Button>
          </Link>
        </div>
      </div>

      {/* Pinned announcements */}
      {announcements.isLoading ? (
        <Skeleton className="mb-4 h-16 w-full" />
      ) : announcementsData.length > 0 ? (
        <div className="mb-4 space-y-3">
          {announcementsData.map((a: any) => (
            <Card key={a.id} className="border-primary/30 bg-primary/5">
              <CardContent className="flex items-start gap-3">
                <MegaphoneIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold">{a.title}</p>
                    <Badge variant="secondary">Announcement</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{a.body}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {/* Community feed */}
      {posts.isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex gap-3">
                <Skeleton className="size-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : postsData.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No community posts yet — start the conversation!
          </p>
          <Link href="/social/post/new">
            <Button className="mt-4" size="sm">
              <PlusIcon className="size-4" />
              Create the first post
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {postsData.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
          {hasMore && (
            <div className="flex justify-center pb-4">
              <Button variant="outline" onClick={() => setPage((v) => v + 1)}>
                Load more
              </Button>
            </div>
          )}
        </div>
      )}
    </SocialShell>
  );
}
