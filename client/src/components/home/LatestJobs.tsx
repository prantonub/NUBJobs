"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { JobCard, type JobCardProps } from "@/components/ui/JobCard";
import { Reveal, Stagger, StaggerItem } from "@/components/motion-primitives";
import api from "@/lib/axios";

const normalizeJob = (job: any): JobCardProps => ({
  id: job.id,
  title: job.title,
  companyName: job.employer?.companyName ?? "NUB Employer",
  companyLogo: job.employer?.logoUrl ?? null,
  type: (job.type ?? "FULL_TIME") as JobCardProps["type"],
  location: job.location ?? undefined,
  salaryMin: job.salaryMin ?? undefined,
  salaryMax: job.salaryMax ?? undefined,
  skills: Array.isArray(job.skills) ? job.skills : [],
  minCgpa: job.minCgpa ?? undefined,
  deadline: job.deadline ? job.deadline : undefined,
  postedAt: job.createdAt ?? new Date().toISOString(),
});

export function LatestJobs() {
  const [jobs, setJobs] = useState<JobCardProps[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadJobs() {
      try {
        const { data } = await api.get("/jobs", {
          params: { limit: 6, sort: "newest" },
        });
        const rows = Array.isArray(data?.data) ? data.data : [];
        if (mounted) setJobs(rows.map(normalizeJob));
      } catch {
        if (mounted) setJobs([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadJobs();
    return () => {
      mounted = false;
    };
  }, []);

  const visibleJobs = useMemo(() => jobs.slice(0, 6), [jobs]);

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

        <Stagger className="mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 lg:grid lg:grid-cols-3 lg:overflow-visible lg:pb-0 [-ms-overflow-style:none] [scrollbar-width:thin]">
          {loading
            ? Array.from({ length: 3 }).map((_, index) => (
                <StaggerItem
                  key={`loading-${index}`}
                  className="w-[300px] shrink-0 snap-start sm:w-[340px] lg:w-auto"
                >
                  <div className="h-[280px] animate-pulse rounded-xl border border-border bg-card/70" />
                </StaggerItem>
              ))
            : visibleJobs.length > 0
              ? visibleJobs.map((job) => (
                  <StaggerItem
                    key={job.id}
                    className="w-[300px] shrink-0 snap-start sm:w-[340px] lg:w-auto"
                  >
                    <JobCard {...job} className="h-full" />
                  </StaggerItem>
                ))
              : (
                  <div className="col-span-full rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
                    No live jobs are available yet. Admin-created jobs will appear here automatically.
                  </div>
                )}
        </Stagger>
      </div>
    </section>
  );
}
