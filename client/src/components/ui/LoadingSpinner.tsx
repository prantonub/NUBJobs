import { Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";

const SPINNER_SIZE = { sm: "size-4", md: "size-6", lg: "size-8" } as const;

export interface LoadingSpinnerProps {
  label?: string;
  size?: keyof typeof SPINNER_SIZE;
  /** Center within a tall min-height area (e.g. full route loading). */
  fullscreen?: boolean;
  className?: string;
}

/**
 * Centered spinner with an optional label. There is no shadcn spinner
 * primitive, so this wraps lucide's Loader2 with `animate-spin`.
 */
export function LoadingSpinner({
  label = "Loading…",
  size = "md",
  fullscreen = false,
  className,
}: LoadingSpinnerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center gap-3 text-muted-foreground",
        fullscreen ? "min-h-[50vh]" : "py-10",
        className
      )}
    >
      <Loader2Icon className={cn("animate-spin text-brand-600", SPINNER_SIZE[size])} />
      {label ? <span className="text-sm">{label}</span> : null}
      <span className="sr-only">Loading</span>
    </div>
  );
}
