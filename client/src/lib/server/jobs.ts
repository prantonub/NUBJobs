import { cache } from "react";

/**
 * Server-side read-only access to the public job endpoints of the Express API.
 *
 * The client-facing app talks to the API through axios (`@/lib/api`), but
 * metadata, JSON-LD and the sitemap are resolved on the server, so they use
 * plain `fetch` here. Every helper is failure-tolerant: a cold/absent API must
 * never break a page render or the production build.
 */

export interface PublicJobEmployer {
  id?: string;
  companyName: string;
  logoUrl?: string | null;
  website?: string | null;
  linkedinUrl?: string | null;
  about?: string | null;
  isVerified?: boolean;
}

/** Subset of the Prisma `Job` record returned by `GET /api/jobs/:id`. */
export interface PublicJob {
  id: string;
  title: string;
  description: string;
  category?: string | null;
  type: string;
  location?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  minCgpa?: number | null;
  skills?: string[] | null;
  deadline?: string | null;
  publishedAt?: string | null;
  createdAt: string;
  employer?: PublicJobEmployer | null;
}

interface JobsListResponse {
  data?: PublicJob[];
  pagination?: { page?: number; pages?: number; total?: number };
}

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      headers: { Accept: "application/json" },
      ...init,
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Single public job by id. Memoised per request so `generateMetadata` and the
 * page component share one fetch. Returns `null` for unknown ids and for a
 * temporary API outage alike, letting the caller degrade gracefully.
 */
export const getPublicJob = cache(async (id: string): Promise<PublicJob | null> => {
  if (!id) return null;
  const payload = await fetchJson<{ data?: PublicJob }>(
    `/jobs/${encodeURIComponent(id)}`,
    { cache: "no-store" }
  );
  return payload?.data ?? null;
});

/** Google recommends ≤50k URLs per sitemap; 10 × 50 keeps the fetch bounded. */
const MAX_SITEMAP_PAGES = 10;
const SITEMAP_PAGE_SIZE = 50;

/**
 * Ids of every ACTIVE job (`GET /api/jobs` filters by status server-side), used
 * to build the job detail entries of the sitemap. Returns an empty array when
 * the API is unreachable so the sitemap still renders with its static routes.
 */
export async function getActiveJobIds(): Promise<string[]> {
  const ids: string[] = [];

  for (let page = 1; page <= MAX_SITEMAP_PAGES; page += 1) {
    const payload = await fetchJson<JobsListResponse>(
      `/jobs?page=${page}&limit=${SITEMAP_PAGE_SIZE}`,
      { next: { revalidate: 3600 } }
    );

    const jobs = payload?.data ?? [];
    if (jobs.length === 0) break;

    for (const job of jobs) {
      if (job?.id) ids.push(job.id);
    }

    const totalPages = payload?.pagination?.pages ?? 0;
    if (page >= totalPages) break;
  }

  return ids;
}