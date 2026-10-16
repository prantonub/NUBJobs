import { cn } from "@/lib/utils";

/**
 * NUBJobs brand glyph: a bold "N" monogram (Northern University Bangladesh)
 * whose right stem launches an upward arrow — the N identity with a career
 * growth trajectory built into it. No literal objects, pure geometric mark.
 *
 * Drawn in currentColor so it inherits the brand gradient tile around it;
 * render it light-on-dark (white on brand-500→700).
 */
export function BrandLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-5", className)}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {/* Left stem (full height). */}
      <rect x="5.5" y="7" width="5.5" height="19" rx="1.6" fill="currentColor" />
      {/* Right stem — shorter, so the arrow rises clear above it. */}
      <rect x="21" y="11" width="5.5" height="15" rx="1.6" fill="currentColor" />
      {/* The N's diagonal. */}
      <path
        d="M8.25 9.2 23.75 23.8"
        stroke="currentColor"
        strokeWidth={5.2}
      />
      {/* Upward arrowhead atop the right stem — growth / ascent. */}
      <path d="M23.75 3.8 27.4 11.3H20.1L23.75 3.8Z" fill="currentColor" />
    </svg>
  );
}