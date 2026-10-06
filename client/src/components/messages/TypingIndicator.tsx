'use client';

import { FC } from 'react';
import { cn } from '@/lib/utils';

/**
 * "Name is typing…" with animated dots (spec §6 TypingIndicator).
 * Renders nothing when nobody is typing.
 */
export const TypingIndicator: FC<{ name: string; visible: boolean; className?: string }> = ({
  name,
  visible,
  className,
}) => {
  if (!visible) return null;
  return (
    <div className={cn('flex items-center gap-2 px-1 text-xs text-muted-foreground', className)} aria-live="polite">
      <span>
        {name} is typing
      </span>
      <span className="inline-flex gap-0.5" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </span>
    </div>
  );
};
