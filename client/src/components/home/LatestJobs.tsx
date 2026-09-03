"use client";

import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { JobCard, type JobCardProps } from "@/components/ui/JobCard";
import { Reveal, Stagger, StaggerItem } from "@/components/motion-primitives";

/**
 * Sample listings for the marketing homepage. These are illustrative only —
 * the live listing page fetches real data from the API.
 */
const SAMPLE_JOBS: JobCardProps[] = [
  {
    id: "1",
    title: "Frontend Engineer (React)",
    companyName: "Brain Station 23",
    type: "FULL_TIME",
    location: "Dhaka",
    salaryMin: 60000,
    salaryMax: 90000,
    skills: ["React", "TypeScript", "Tailwind"],
    minCgpa: 3.0,
    deadline: "2026-09-20",
    postedAt: "2026-08-28",
  },
  {
    id: "2",
    title: "Data Science Intern",
    companyName: "Pathao",
    type: "INTERNSHIP",
    location: "Dhaka",
    salaryMin: 20000,
    skills: ["Python", "Pandas", "SQL"],
    minCgpa: 3.25,
    deadline: "2026-09-12",
    postedAt: "2026-08-27",
  },
  {
    id: "3",
    title: "Digital Marketing Executive",
    companyName: "Shohoz",
    type: "FULL_TIME",
    location: "Dhaka",
    salaryMin: 35000,
    salaryMax: 50000,
    skills: ["SEO", "Meta Ads", "Analytics"],
    deadline: "2026-09-25",
    postedAt: "2026-08-26",
  },
  {
    id: "4",
    title: "UI/UX Designer",
    companyName: "Sheba.xyz",
    type: "HYBRID",
    location: "Dhaka",
    salaryMin: 40000,
    salaryMax: 65000,
    skills: ["Figma", "Prototyping", "Design Systems"],
    deadline: "2026-10-02",
    postedAt: "2026-08-25",
  },
  {
    id: "5",
    title: "Backend Developer (Node.js)",
    companyName: "Tiger IT",
    type: "REMOTE",
    salaryMin: 55000,
    salaryMax: 85000,
    skills: ["Node.js", "PostgreSQL", "AWS"],
    minCgpa: 3.0,
    deadline: "2026-09-18",
    postedAt: "2026-08-24",
  },
  {
    id: "6",
    title: "Junior Financial Analyst",
    companyName: "BRAC Bank",
    type: "FULL_TIME",
    location: "Dhaka",
    salaryMin: 38000,
    salaryMax: 52000,
    skills: ["Excel", "Financial Modeling", "Reporting"],
    minCgpa: 3.5,
    deadline: "2026-09-30",
    postedAt: "2026-08-23",
  },
];

/**
 * "Latest jobs" band: a horizontally scrollable rail of job cards on small
 * screens, a grid on large screens. Cards slide in from the bottom in sequence
 * as the section enters the viewport.
 */
export function LatestJobs() {
  return (
    <section className="border-y border-border bg-muted/40">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Latest Job Openings
            </h2>
            <p className="mt-3 text-muted-foreground">
              Freshly posted roles from companies hiring NUB students right now.
            </p>
          </div>
          <Button asChild variant="outline" className="shrink-0">
            <Link href="/jobs">
              View All
              <ArrowRightIcon className="size-4" />
            </Link>
          </Button>
        </Reveal>

        {/* Mobile / tablet: horizontal scroll rail. lg+: 3-col grid. */}
        <Stagger className="mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 lg:grid lg:grid-cols-3 lg:overflow-visible lg:pb-0 [-ms-overflow-style:none] [scrollbar-width:thin]">
          {SAMPLE_JOBS.map((job) => (
            <StaggerItem
              key={job.id}
              className="w-[300px] shrink-0 snap-start sm:w-[340px] lg:w-auto"
            >
              <JobCard {...job} className="h-full" />
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
