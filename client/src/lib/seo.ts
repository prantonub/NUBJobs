import type { PublicJob } from "@/lib/server/jobs";
import { siteName, siteUrl } from "@/lib/site";

/**
 * Search-engine structured data helpers.
 *
 * Only fields that genuinely exist on the `Job` / `EmployerProfile` rows are
 * emitted, and only public employer fields (company name, website, public logo
 * URL) — never student or employer account data.
 */

/** schema.org `employmentType` values for the Prisma `JobType` enum. */
const EMPLOYMENT_TYPE: Record<string, string> = {
  FULL_TIME: "FULL_TIME",
  PART_TIME: "PART_TIME",
  INTERNSHIP: "INTERN",
  CONTRACT: "CONTRACTOR",
};

const TELECOMMUTE_HINTS = ["remote", "anywhere", "work from home", "wfh", "online"];

/** Uploaded avatars are stored as base64 `data:` URLs — not usable as schema URLs. */
function isPublicHttpUrl(value: string | null | undefined): value is string {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

function toIsoDate(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

/**
 * Serialise a JSON-LD object for embedding in a `<script>` tag.
 *
 * `JSON.stringify` does not escape HTML-significant characters, so a title or
 * description containing `</script>` could break out of the tag. Escaping the
 * U+003C / U+003E / U+0026 characters (and the JS line separators) keeps the
 * payload valid JSON-LD while making injection impossible.
 */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/** Absolute, canonical URL of a public job detail page. */
export function jobUrl(id: string): string {
  return new URL(`/jobs/${encodeURIComponent(id)}`, `${siteUrl}/`).toString();
}

/**
 * Build a schema.org `JobPosting` for a job detail page.
 *
 * Returns `null` when required data (description, posting date) is missing —
 * an incomplete JobPosting is worse than none for Rich Results.
 */
export function buildJobPostingJsonLd(job: PublicJob): Record<string, unknown> | null {
  const title = job.title?.trim();
  const description = job.description?.trim();
  const datePosted = toIsoDate(job.publishedAt) ?? toIsoDate(job.createdAt);

  if (!title || !description || !datePosted) return null;

  const companyName = job.employer?.companyName?.trim() || siteName;

  const hiringOrganization: Record<string, unknown> = {
    "@type": "Organization",
    name: companyName,
  };
  if (isPublicHttpUrl(job.employer?.website)) {
    hiringOrganization.sameAs = job.employer.website;
  }
  if (isPublicHttpUrl(job.employer?.logoUrl)) {
    hiringOrganization.logo = job.employer.logoUrl;
  }

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title,
    description,
    datePosted,
    identifier: {
      "@type": "PropertyValue",
      name: siteName,
      value: job.id,
    },
    url: jobUrl(job.id),
    hiringOrganization,
    employmentType: EMPLOYMENT_TYPE[job.type] ?? job.type,
    directApply: false,
  };

  // Location: either a postal address, or "remote" as required by Google Jobs.
  const location = job.location?.trim();
  const isRemote =
    !location ||
    TELECOMMUTE_HINTS.some((hint) => location.toLowerCase().includes(hint));

  if (isRemote) {
    jsonLd.jobLocationType = "TELECOMMUTE";
    jsonLd.applicantLocationRequirements = {
      "@type": "Country",
      name: "Bangladesh",
    };
  } else {
    jsonLd.jobLocation = {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: location,
        addressCountry: "BD",
      },
    };
  }

  const validThrough = toIsoDate(job.deadline);
  if (validThrough) jsonLd.validThrough = validThrough;

  const salaryMin = typeof job.salaryMin === "number" ? job.salaryMin : undefined;
  const salaryMax = typeof job.salaryMax === "number" ? job.salaryMax : undefined;
  if (salaryMin !== undefined || salaryMax !== undefined) {
    jsonLd.baseSalary = {
      "@type": "MonetaryAmount",
      currency: "BDT",
      value: {
        "@type": "QuantitativeValue",
        unitText: "MONTH",
        ...(salaryMin !== undefined ? { minValue: salaryMin } : {}),
        ...(salaryMax !== undefined ? { maxValue: salaryMax } : {}),
      },
    };
  }

  const category = job.category?.trim();
  if (category) jsonLd.occupationalCategory = category;

  const skills = (job.skills ?? []).filter((skill) => typeof skill === "string" && skill.trim());
  if (skills.length > 0) jsonLd.skills = skills.join(", ");

  return jsonLd;
}