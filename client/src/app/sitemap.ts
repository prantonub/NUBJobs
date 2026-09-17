import type { MetadataRoute } from "next";

import { getActiveJobIds } from "@/lib/server/jobs";
import { absoluteUrl, publicRoutes } from "@/lib/site";

/**
 * `/sitemap.xml`
 *
 * Public marketing routes plus one entry per ACTIVE job. Private/authenticated
 * sections and auth utility pages are intentionally absent — see
 * `privateRoutePaths` in `@/lib/site` and the matching `robots.txt` rules.
 *
 * `getActiveJobIds()` swallows API/database failures, so a production build
 * never fails because the backend is cold: the sitemap simply falls back to the
 * static routes and self-heals on its next revalidation.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();

  const staticEntries: MetadataRoute.Sitemap = publicRoutes.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const jobIds = await getActiveJobIds();
  const jobEntries: MetadataRoute.Sitemap = jobIds.map((id) => ({
    url: absoluteUrl(`/jobs/${encodeURIComponent(id)}`),
    lastModified,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  return [...staticEntries, ...jobEntries];
}