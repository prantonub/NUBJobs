/**
 * Canonical site configuration shared by the root layout metadata, the sitemap,
 * robots.txt and the web app manifest.
 *
 * The public origin comes from `NEXT_PUBLIC_SITE_URL` so no production URL is
 * hardcoded. When that is unset we fall back to the Vercel deployment URL (if
 * present) and finally to localhost, which keeps local development and the
 * production build working without extra setup.
 */

const FALLBACK_SITE_URL = "http://localhost:3000";

function toOrigin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

/** Vercel exposes `VERCEL_URL` as a bare hostname (no protocol). */
function toOriginFromHostname(value: string | undefined): string | null {
  if (!value) return null;
  return toOrigin(value.startsWith("http") ? value : `https://${value}`);
}

export const siteUrl: string =
  toOrigin(process.env.NEXT_PUBLIC_SITE_URL) ??
  toOriginFromHostname(process.env.VERCEL_URL) ??
  FALLBACK_SITE_URL;

/** Brand name, overridable per environment (`NEXT_PUBLIC_APP_NAME`). */
export const siteName = process.env.NEXT_PUBLIC_APP_NAME || "NUBJobs";

export const siteDescription =
  "Discover jobs and internships, track applications, and connect with employers — the career portal built for Northern University Bangladesh students.";

export const siteKeywords = [
  "NUBJobs",
  "Northern University Bangladesh",
  "NUB jobs",
  "NUB internships",
  "student jobs Bangladesh",
  "graduate jobs Dhaka",
  "campus recruitment",
  "internship portal",
  "job application tracker",
  "entry level jobs Bangladesh",
];

export const siteLocale = "en_US";

/** Brand blue (`brand-600`), also used as the PWA theme colour. */
export const siteThemeColor = "#1a56db";

/** Matches the app's light background so the splash screen does not flash. */
export const siteBackgroundColor = "#ffffff";

/** Build an absolute URL for a site-relative path. */
export function absoluteUrl(path = "/"): string {
  return new URL(path, `${siteUrl}/`).toString();
}

export interface PublicRoute {
  path: string;
  changeFrequency: "daily" | "weekly" | "monthly";
  priority: number;
}

/**
 * Publicly indexable routes. Authenticated sections (dashboard, admin,
 * employer, profile, messages, settings, invitations, reviews) and the offline
 * / design-system utilities are deliberately excluded — see `privateRoutePaths`.
 */
export const publicRoutes: PublicRoute[] = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/jobs", changeFrequency: "daily", priority: 0.9 },
  { path: "/events", changeFrequency: "weekly", priority: 0.6 },
];

/**
 * Route prefixes that require a signed-in user (or are internal tooling) and
 * must stay out of the sitemap and out of search engine indexes. robots.txt
 * prefix-matches, so a bare prefix also covers its nested routes.
 */
export const privateRoutePaths = [
  "/admin",
  "/dashboard",
  "/employer",
  "/profile",
  "/messages",
  "/settings",
  "/invitations",
  "/reviews",
  "/offline",
  "/design-system",
];