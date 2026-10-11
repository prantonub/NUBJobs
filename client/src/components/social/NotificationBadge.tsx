'use client';

import { useUnreadCount } from '@/hooks/useSocialMessages';
import { cn } from '@/lib/utils';

/**
 * Red pill for unread messages (spec §NotificationBadge).
 * Subscribes to the shared `social.unreadMessages` key, which the realtime
 * hook refreshes the moment a message arrives.
 */
export function NotificationBadge({ className }: { className?: string }) {
  const { data } = useUnreadCount();
  const count = Number((data as any)?.unreadCount ?? 0);
  if (count <= 0) return null;
  return (
    <span
      className={cn(
        'inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground',
        className
      )}
      aria-label={`${count} unread messages`}
    >
      {count > 9 ? '9+' : count}
    </span>
  );
}
