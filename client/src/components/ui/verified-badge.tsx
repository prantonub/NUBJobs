import { BadgeCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Shohoz-style verified pill: light-blue rounded pill with a blue
 * check seal + "Verified" text. Renders under/beside the name, e.g.
 * "Shohoz" with the pill below it.
 *
 * `variant="seal"` renders the icon only for tight inline spots
 * (job cards, admin rows) — no text.
 */
export function VerifiedBadge({
  className,
  iconClassName,
  label,
  variant = 'pill',
  size = 'sm',
}: {
  className?: string;
  iconClassName?: string;
  /** @deprecated — the pill always shows "Verified"; use `variant="seal"` for icon-only. */
  label?: boolean;
  variant?: 'pill' | 'seal';
  size?: 'sm' | 'lg';
}) {
  const sealOnly = variant === 'seal' && !label;

  if (sealOnly) {
    return (
      <span className={cn('inline-flex shrink-0 items-center', className)} title="Verified">
        <BadgeCheck
          className={cn(size === 'lg' ? 'size-6' : 'size-4', 'shrink-0', iconClassName)}
          fill="#1D9BF0"
          color="#ffffff"
          aria-label="Verified account"
        />
        <span className="sr-only">Verified</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full bg-[#E8F3FF] font-semibold text-[#1D9BF0]',
        size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs',
        className
      )}
      title="Verified"
    >
      <BadgeCheck
        className={cn(size === 'lg' ? 'size-5' : 'size-3.5', 'shrink-0', iconClassName)}
        fill="#1D9BF0"
        color="#ffffff"
        aria-hidden="true"
      />
      Verified
      <span className="sr-only">Verified</span>
    </span>
  );
}
