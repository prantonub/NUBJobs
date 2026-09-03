import Link from "next/link";
import {
  CodeIcon,
  DatabaseIcon,
  LandmarkIcon,
  MegaphoneIcon,
  PaletteIcon,
  TrendingUpIcon,
} from "lucide-react";

import { Reveal, Stagger, StaggerItem } from "@/components/motion-primitives";

interface Category {
  slug: string;
  label: string;
  count: number;
  icon: React.ReactNode;
  /** Tailwind classes for the icon chip (light + dark). */
  color: string;
}

const CATEGORIES: Category[] = [
  {
    slug: "software-engineering",
    label: "Software Engineering",
    count: 148,
    icon: <CodeIcon />,
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  {
    slug: "marketing",
    label: "Marketing",
    count: 72,
    icon: <MegaphoneIcon />,
    color: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
  },
  {
    slug: "finance",
    label: "Finance",
    count: 64,
    icon: <LandmarkIcon />,
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  {
    slug: "design",
    label: "Design",
    count: 53,
    icon: <PaletteIcon />,
    color: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  },
  {
    slug: "data-science",
    label: "Data Science",
    count: 41,
    icon: <DatabaseIcon />,
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  {
    slug: "business-development",
    label: "Business Development",
    count: 38,
    icon: <TrendingUpIcon />,
    color: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  },
];

/**
 * Grid of job categories. Each card links to the pre-filtered job listing and
 * fades in with a staggered delay as the section enters the viewport.
 */
export function JobCategories() {
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
        {CATEGORIES.map((category) => (
          <StaggerItem key={category.slug}>
            <Link
              href={`/jobs?category=${category.slug}`}
              className="group flex h-full items-center gap-4 rounded-xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md dark:hover:border-brand-900"
            >
              <div
                className={`flex size-14 shrink-0 items-center justify-center rounded-xl [&_svg]:size-7 ${category.color}`}
              >
                {category.icon}
              </div>
              <div className="min-w-0">
                <h3 className="font-heading font-semibold text-foreground transition-colors group-hover:text-brand-600">
                  {category.label}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {category.count} open positions
                </p>
              </div>
            </Link>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}
