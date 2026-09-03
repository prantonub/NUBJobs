import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type SkillProficiency = "Beginner" | "Intermediate" | "Expert";

const VARIANTS = {
  default: "bg-muted text-foreground/80 ring-1 ring-inset ring-border",
  primary:
    "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100 dark:bg-brand-900/30 dark:text-brand-100 dark:ring-brand-900",
} as const;

const PROFICIENCY_DOT: Record<SkillProficiency, string> = {
  Expert: "bg-green-500",
  Intermediate: "bg-yellow-500",
  Beginner: "bg-gray-400",
};

export interface SkillTagProps
  extends Omit<React.ComponentProps<"span">, "onClick"> {
  variant?: keyof typeof VARIANTS;
  /** Shows a colored proficiency dot before the label. */
  proficiency?: SkillProficiency;
  /** When provided, renders a removable "×" button that calls this handler. */
  onRemove?: () => void;
}

/**
 * Compact skill pill. Use `variant="primary"` for emphasis, `proficiency` to
 * surface skill level with a colored dot, and `onRemove` to make it removable.
 */
export function SkillTag({
  variant = "default",
  proficiency,
  onRemove,
  className,
  children,
  ...props
}: SkillTagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        VARIANTS[variant],
        className
      )}
      {...props}
    >
      {proficiency ? (
        <span
          className={cn("size-1.5 rounded-full", PROFICIENCY_DOT[proficiency])}
          aria-hidden
        />
      ) : null}
      {children}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove"
          className="-mr-1 ml-0.5 inline-flex size-3.5 items-center justify-center rounded-full opacity-70 transition hover:bg-black/10 hover:opacity-100 dark:hover:bg-white/15"
        >
          <XIcon className="size-3" />
        </button>
      ) : null}
    </span>
  );
}
