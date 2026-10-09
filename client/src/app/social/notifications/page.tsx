'use client';

import { SocialNav, SocialShell } from '@/components/social/SocialNav';
import { NotificationItem } from '@/components/social/SocialExtras';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useNotifications,
  useReadAllNotifications,
  useReadNotification,
  useSocialSocket,
} from '@/hooks/useSocial';
import { useState } from 'react';

/** /social/notifications — notification center. */
export default function NotificationsPage() {
  useSocialSocket();
  const [page, setPage] = useState(1);
  const query = useNotifications(page);
  const readOne = useReadNotification();
  const readAll = useReadAllNotifications();

  const items: any[] = (query.data as any)?.notifications ?? [];
  const unreadCount: number = (query.data as any)?.unreadCount ?? 0;

  return (
    <SocialShell>
      <SocialNav
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
      />

      <div className="mb-3 flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={unreadCount === 0 || readAll.isPending}
          onClick={() => readAll.mutate()}
        >
          Mark all as read
        </Button>
      </div>

      {query.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No notifications yet. Follows, likes and comments will show up here.</p>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <NotificationItem key={n.id} n={n} onOpen={() => { if (!n.isRead) readOne.mutate(n.id); }} />
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
