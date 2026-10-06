'use client';

import { FC } from 'react';
import { cn } from '@/lib/utils';

/**
 * Red pill with the unread number (spec §9 NotificationBadge).
 * Hidden when the count is zero.
 */
export const NotificationBadge: FC<{ count: number; className?: string }> = ({ count, className }) => {
  if (!count || count <= 0) return null;
  return (
    <span
      className={cn(
        'inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white',
        className
      )}
      aria-label={`${count} unread`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
};
