"use client";

import Link from "next/link";
import {
  BriefcaseIcon,
  CodeIcon,
  DatabaseIcon,
  LandmarkIcon,
  MegaphoneIcon,
  PaletteIcon,
  TrendingUpIcon,
} from "lucide-react";

import { Reveal, Stagger, StaggerItem } from "@/components/motion-primitives";
import { useJobCategories } from "@/hooks/useJobs";

interface CategoryVisual {
  slug: string;
  icon: React.ReactNode;
  /** Tailwind classes for the icon chip (light + dark). */
  color: string;
}

const VISUALS: CategoryVisual[] = [
  {
    slug: "software-engineering",
    icon: <CodeIcon />,
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  {
    slug: "marketing",
    icon: <MegaphoneIcon />,
    color: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
  },
  {
    slug: "finance",
    icon: <LandmarkIcon />,
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  {
    slug: "design",
    icon: <PaletteIcon />,
    color: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  },
  {
    slug: "data-science",
    icon: <DatabaseIcon />,
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  {
    slug: "business-development",
    icon: <TrendingUpIcon />,
    color: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  },
];

const DEFAULT_COLOR = "bg-brand-500/10 text-brand-600 dark:text-brand-400";

/** Shown while the live categories load and when no jobs exist yet. */
const FALLBACK_CATEGORIES = [
  "Software Engineering",
  "Marketing",
  "Finance",
  "Design",
  "Data Science",
  "Business Development",
];

const slugify = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/**
 * Grid of job categories. Each card links to the pre-filtered job listing and
 * fades in with a staggered delay as the section enters the viewport.
 */
export function JobCategories() {
  const { data: apiCategories } = useJobCategories();

  const categories =
    apiCategories && apiCategories.length > 0
      ? apiCategories.map((category) => ({
          label: category.label,
          value: category.value,
          slug: category.slug,
          count: category.count,
        }))
      : FALLBACK_CATEGORIES.map((label) => ({
          label,
          value: label,
          slug: slugify(label),
          count: undefined as number | undefined,
        }));

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <Reveal className="mx-auto max-w-2xl text-center">
        <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Explore by Category
        </h2>
        <p className="mt-3 text-muted-foreground">
          Browse openings across the fields NUB students are hired into most.
        </p>
      </Reveal>

      <Stagger className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => {
          const visual = VISUALS.find((item) => item.slug === category.slug);

          return (
            <StaggerItem key={category.slug}>
              <Link
                href={`/jobs?category=${encodeURIComponent(category.value)}`}
                className="group flex h-full items-center gap-4 rounded-xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md dark:hover:border-brand-900"
              >
                <div
                  className={`flex size-14 shrink-0 items-center justify-center rounded-xl [&_svg]:size-7 ${
                    visual?.color ?? DEFAULT_COLOR
                  }`}
                >
                  {visual?.icon ?? <BriefcaseIcon />}
                </div>
                <div className="min-w-0">
                  <h3 className="font-heading font-semibold text-foreground transition-colors group-hover:text-brand-600">
                    {category.label}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {typeof category.count === "number"
                      ? `${category.count} open position${category.count === 1 ? "" : "s"}`
                      : "Browse openings"}
                  </p>
                </div>
              </Link>
            </StaggerItem>
          );
        })}
      </Stagger>
    </section>
  );
}
