import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type ApplicationStatus =
  | "APPLIED"
  | "REVIEWED"
  | "SHORTLISTED"
  | "INTERVIEWED"
  | "HIRED"
  | "REJECTED";

const STATUS_STYLES: Record<
  ApplicationStatus,
  { label: string; className: string }
> = {
  APPLIED: {
    label: "Applied",
    className:
      "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300",
  },
  REVIEWED: {
    label: "Reviewed",
    className:
      "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900 dark:bg-purple-950 dark:text-purple-300",
  },
  SHORTLISTED: {
    label: "Shortlisted",
    className:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  },
  INTERVIEWED: {
    label: "Interviewed",
    className:
      "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-300",
  },
  HIRED: {
    label: "Hired",
    className:
      "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300",
  },
  REJECTED: {
    label: "Rejected",
    className:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
  },
};

export interface ApplicationStatusBadgeProps
  extends React.ComponentProps<"span"> {
  status: ApplicationStatus;
}

/**
 * Color-coded pill for an application's lifecycle status. Colors follow the
 * NUBJobs status scale (Applied → Reviewed → Shortlisted → Interviewed →
 * Hired / Rejected) and adapt to dark mode.
 */
export function ApplicationStatusBadge({
  status,
  className,
  ...props
}: ApplicationStatusBadgeProps) {
  const config = STATUS_STYLES[status] ?? STATUS_STYLES.APPLIED;
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", config.className, className)}
      {...props}
    >
      {config.label}
    </Badge>
  );
}
