'use client';

import { cn } from '@/lib/utils';
import { lastActiveLabel } from '@/lib/messageService';

/**
 * Online dot + "Active 2h ago" label (spec §OnlineStatus).
 * Green when online, gray otherwise; the label is optional (list rows show
 * only the dot, the chat header shows the label too).
 */
export function OnlineStatus({
  isOnline,
  lastSeenAt,
  withLabel = false,
  className,
}: {
  isOnline: boolean;
  lastSeenAt?: string | Date | null;
  withLabel?: boolean;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span
        aria-label={isOnline ? 'Online' : 'Offline'}
        className={cn(
          'inline-block size-2.5 shrink-0 rounded-full ring-2 ring-background',
          isOnline ? 'bg-emerald-500' : 'bg-muted-foreground/40'
        )}
      />
      {withLabel && (
        <span className="text-xs text-muted-foreground">
          {lastActiveLabel(isOnline, lastSeenAt)}
        </span>
      )}
    </span>
  );
}
