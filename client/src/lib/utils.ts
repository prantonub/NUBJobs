import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow } from "date-fns";

/**
 * Merge Tailwind class names, resolving conflicts (shadcn/ui convention).
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a salary range in Bangladeshi Taka (৳).
 * @example formatSalary(15000, 25000) // "৳15,000 - ৳25,000"
 * @example formatSalary(15000)        // "৳15,000+"
 * @example formatSalary()             // "Negotiable"
 */
export function formatSalary(min?: number | null, max?: number | null): string {
  const taka = (n: number) => `৳${Math.round(n).toLocaleString("en-US")}`;
  if (min != null && max != null) return `${taka(min)} - ${taka(max)}`;
  if (min != null) return `${taka(min)}+`;
  if (max != null) return `Up to ${taka(max)}`;
  return "Negotiable";
}

/**
 * Relative "time ago" string using date-fns.
 * @example formatDate("2026-08-25") // "2 days ago"
 */
export function formatDate(date: string | number | Date): string {
  const parsed = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";
  return formatDistanceToNow(parsed, { addSuffix: true });
}

/**
 * Format a CGPA against a scale (default 4.00).
 * @example formatCGPA(3.75) // "3.75 / 4.00"
 */
export function formatCGPA(cgpa: number, scale = 4): string {
  return `${cgpa.toFixed(2)} / ${scale.toFixed(2)}`;
}

/**
 * Up-to-two-letter initials from a name.
 * @example getInitials("John Doe") // "JD"
 * @example getInitials("Grameenphone") // "GR"
 */
export function getInitials(name: string): string {
  if (!name) return "";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  const letters =
    parts.length === 1
      ? parts[0].slice(0, 2)
      : `${parts[0][0]}${parts[parts.length - 1][0]}`;
  return letters.toUpperCase();
}

/**
 * Best-effort human-readable message from a thrown value — typically an Axios
 * error whose server payload lives at `response.data.message`. Falls back to
 * the error's own message, then a generic default.
 */
export function getErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again."
): string {
  if (typeof error === "object" && error !== null) {
    const maybeAxios = error as {
      response?: { data?: { message?: unknown; error?: unknown } };
      message?: unknown;
    };
    const data = maybeAxios.response?.data;
    if (data) {
      if (typeof data.message === "string" && data.message) return data.message;
      if (typeof data.error === "string" && data.error) return data.error;
    }
    if (typeof maybeAxios.message === "string" && maybeAxios.message) {
      return maybeAxios.message;
    }
  }
  return fallback;
}

/**
 * Percentage overlap (0–100) between a job's required skills and a student's
 * skills. Case-insensitive, whitespace-tolerant.
 * @example calculateMatchScore(["React", "Node"], ["react"]) // 50
 */
export function calculateMatchScore(
  jobSkills: string[],
  studentSkills: string[]
): number {
  if (!jobSkills?.length) return 0;
  const owned = new Set(
    (studentSkills ?? []).map((s) => s.trim().toLowerCase()).filter(Boolean)
  );
  const matched = jobSkills.filter((s) => owned.has(s.trim().toLowerCase())).length;
  return Math.round((matched / jobSkills.length) * 100);
}
