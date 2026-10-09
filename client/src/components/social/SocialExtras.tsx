'use client';

import { UserAvatar, type SocialUser } from './SocialUsers';
import { timeAgo } from './social-helpers';
import { useFollowSuggestions, useTrendingHashtags } from '@/hooks/useSocial';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell } from 'lucide-react';
import Link from 'next/link';

const NOTIF_LABEL: Record<string, string> = {
  FOLLOW: 'followed you',
  LIKE: 'liked your content',
  COMMENT: 'commented on your post',
  MESSAGE: 'sent you a message',
  MENTION: 'mentioned you',
  NEW_MESSAGE: 'sent you a message',
};

export interface SocialNotification {
  id: string;
  type: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string | Date;
  fromUser?: SocialUser | null;
}

/** One notification row (spec §NotificationItem). */
export function NotificationItem({ n, onOpen }: { n: SocialNotification; onOpen?: () => void }) {
  const label = NOTIF_LABEL[n.type] ?? 'notified you';
  return (
    <Link
      href={n.link ?? '#'}
      onClick={onOpen}
      className={`flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/60 ${
        n.isRead ? 'bg-card' : 'bg-primary/5'
      }`}
    >
      <span className="relative shrink-0">
        <UserAvatar user={n.fromUser ?? { name: 'N', photo: null }} size="sm" />
        {!n.isRead && <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-primary ring-2 ring-card" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">
          <strong>{n.fromUser?.name ?? 'Someone'}</strong>{' '}
          <span className="text-muted-foreground">{n.message || label}</span>
        </p>
        <p className="text-xs text-muted-foreground">{timeAgo(n.createdAt)}</p>
      </div>
      <Bell className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

/** Trending hashtag row (spec §TrendingHashtag). */
export function TrendingRow({ name, postCount }: { name: string; postCount: number }) {
  return (
    <Link
      href={`/social/explore?tag=${encodeURIComponent(name)}`}
      className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted"
    >
      <span className="font-medium text-primary">#{name}</span>
      <span className="text-xs text-muted-foreground">{postCount} post{postCount === 1 ? '' : 's'}</span>
    </Link>
  );
}

/** Right-rail card: trending hashtags (spec: sidebar). */
export function TrendingCard({ limit = 5 }: { limit?: number }) {
  const trending = useTrendingHashtags(limit);
  const items: { name: string; postCount: number }[] = trending.data?.hashtags ?? [];
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="mb-2 text-sm font-semibold">Trending hashtags</h2>
      {trending.isLoading && <Skeleton className="h-16 w-full" />}
      {!trending.isLoading && items.length === 0 && (
        <p className="text-xs text-muted-foreground">No hashtags yet — be the first to post one.</p>
      )}
      {items.map((t) => (
        <TrendingRow key={t.name} name={t.name} postCount={t.postCount} />
      ))}
    </section>
  );
}

/** Right-rail card: suggested users (spec: sidebar). */
export function SuggestionsCard({ limit = 5 }: { limit?: number }) {
  const sug = useFollowSuggestions(limit);
  const users: SocialUser[] = sug.data?.users ?? [];
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="mb-2 text-sm font-semibold">Suggested for you</h2>
      {sug.isLoading && <Skeleton className="h-20 w-full" />}
      {!sug.isLoading && users.length === 0 && (
        <p className="text-xs text-muted-foreground">No suggestions right now.</p>
      )}
      <div className="space-y-2">
        {users.map((u) => (
          <div key={u.id} className="flex items-center gap-2">
            <Link href={`/social/${u.username}`}>
              <UserAvatar user={u} size="sm" />
            </Link>
            <div className="min-w-0 flex-1">
              <Link href={`/social/${u.username}`} className="block truncate text-sm font-semibold hover:underline">
                {u.name}
              </Link>
              <p className="truncate text-xs text-muted-foreground">@{u.username}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
