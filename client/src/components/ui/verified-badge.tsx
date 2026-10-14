import { BadgeCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Twitter-style verified seal: scalloped badge filled with Twitter blue
 * (#1D9BF0) and a white check. Renders beside the name, e.g.
 * "Pranto Islam [seal]".
 */
export function VerifiedBadge({
  className,
  iconClassName,
  label = false,
}: {
  className?: string;
  iconClassName?: string;
  /** Show a "Verified" text chip next to the seal (default: seal only). */
  label?: boolean;
}) {
  return (
    <span className={cn('inline-flex items-center gap-1', className)} title="Verified">
      <BadgeCheck
        className={cn('size-4 shrink-0', iconClassName)}
        fill="#1D9BF0"
        color="#ffffff"
        aria-label="Verified account"
      />
      {label ? <span className="text-xs font-semibold text-[#1D9BF0]">Verified</span> : null}
      <span className="sr-only">Verified</span>
    </span>
  );
}
