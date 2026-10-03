import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** Every lifecycle status the employer + student surfaces render. */
export type AnyStatus =
  | "APPLIED"
  | "REVIEWED"
  | "SHORTLISTED"
  | "INTERVIEWED"
  | "HIRED"
  | "REJECTED"
  | "WITHDRAWN"
  | "DRAFT"
  | "PENDING"
  | "ACTIVE"
  | "CLOSED";

const STATUS_STYLES: Record<AnyStatus, { label: string; className: string }> = {
  APPLIED: {
    label: "Applied",
    className: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300",
  },
  REVIEWED: {
    label: "Reviewed",
    className: "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900 dark:bg-purple-950 dark:text-purple-300",
  },
  SHORTLISTED: {
    label: "Shortlisted",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
  },
  INTERVIEWED: {
    label: "Interviewed",
    className: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-300",
  },
  HIRED: {
    label: "Hired",
    className: "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300",
  },
  REJECTED: {
    label: "Rejected",
    className: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
  },
  WITHDRAWN: {
    label: "Withdrawn",
    className: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300",
  },
  DRAFT: {
    label: "Draft",
    className: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300",
  },
  PENDING: {
    label: "Pending",
    className: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  },
  ACTIVE: {
    label: "Active",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
  },
  CLOSED: {
    label: "Closed",
    className: "border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
};

export interface StatusBadgeProps extends React.ComponentProps<"span"> {
  status: AnyStatus | string;
  /** Renders the raw enum instead of the title-cased label. */
  raw?: boolean;
}

/**
 * One badge for every status in the product (application lifecycle AND job
 * lifecycle), so the same colour means the same thing everywhere.
 */
export function StatusBadge({ status, raw = false, className, ...props }: StatusBadgeProps) {
  const config = STATUS_STYLES[status as AnyStatus] ?? STATUS_STYLES.APPLIED;
  const label = raw
    ? String(status)
    : config.label ?? String(status).charAt(0) + String(status).slice(1).toLowerCase();

  return (
    <Badge variant="outline" className={cn("font-medium", config.className, className)} {...props}>
      {label}
    </Badge>
  );
}

export default StatusBadge;