'use client';

import { FC } from 'react';
import { cn } from '@/lib/utils';

/**
 * Green/gray presence dot with an optional "last seen" label
 * (spec §7 OnlineStatus).
 */
export const OnlineStatus: FC<{ online: boolean; label?: string; className?: string }> = ({
  online,
  label,
  className,
}) => {
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs text-muted-foreground', className)}>
      <span
        className={cn(
          'size-2 rounded-full',
          online ? 'bg-green-500' : 'bg-gray-400'
        )}
        aria-hidden
      />
      {label ? <span>{label}</span> : online ? <span>Online</span> : <span>Offline</span>}
    </span>
  );
};
