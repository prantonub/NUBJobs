"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRightIcon, BriefcaseIcon, SearchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Reveal } from "@/components/motion-primitives";

export const JOB_LOCATIONS = [
  "Dhaka",
  "Chattogram",
  "Sylhet",
  "Khulna",
  "Rajshahi",
  "Remote",
] as const;

export const JOB_CATEGORIES = [
  { value: "software-engineering", label: "Software Engineering" },
  { value: "marketing", label: "Marketing" },
  { value: "finance", label: "Finance" },
  { value: "design", label: "Design" },
  { value: "data-science", label: "Data Science" },
  { value: "business-development", label: "Business Development" },
] as const;

/**
 * Landing hero: gradient background, animated headline that slides up on load,
 * a search bar (title + location + category), and primary CTAs.
 */
export function HeroSection() {
  const router = useRouter();
  const [title, setTitle] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [category, setCategory] = React.useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (title.trim()) params.set("q", title.trim());
    if (location) params.set("location", location);
    if (category) params.set("category", category);
    const query = params.toString();
    router.push(query ? `/jobs?${query}` : "/jobs");
  };

  return (
    <section className="relative isolate overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-navy text-white">
      {/* decorative glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full bg-brand-500/30 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-24 size-96 rounded-full bg-brand-900/40 blur-3xl"
      />

      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal animateOnMount delay={0.05}>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
              🎓 Exclusively for Northern University Bangladesh students
            </span>
          </Reveal>

          <Reveal animateOnMount delay={0.15}>
            <h1 className="mt-6 font-heading text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Find Your Dream Job as a{" "}
              <span className="bg-gradient-to-r from-blue-200 to-white bg-clip-text text-transparent">
                NUB Student
              </span>
            </h1>
          </Reveal>

          <Reveal animateOnMount delay={0.25}>
            <p className="mx-auto mt-5 max-w-2xl text-base text-blue-100 sm:text-lg">
              Discover jobs and internships tailored to your degree, filter by
              CGPA, join campus drives, and track every application — all in one
              place built for your campus.
            </p>
          </Reveal>

          {/* Search bar */}
          <Reveal animateOnMount delay={0.35}>
            <form
              onSubmit={handleSearch}
              className="mx-auto mt-8 flex max-w-3xl flex-col gap-3 rounded-2xl bg-white p-3 shadow-2xl shadow-brand-900/30 sm:flex-row sm:items-center dark:bg-card"
            >
              <div className="relative flex-1">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Job title or keyword"
                  aria-label="Job title or keyword"
                  className="h-11 border-0 pl-9 text-foreground shadow-none focus-visible:ring-0"
                />
              </div>

              <div className="hidden h-6 w-px bg-border sm:block" />

              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger
                  aria-label="Location"
                  className="h-11 w-full border-0 shadow-none focus-visible:ring-0 sm:w-40"
                >
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  {JOB_LOCATIONS.map((loc) => (
                    <SelectItem key={loc} value={loc}>
                      {loc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="hidden h-6 w-px bg-border sm:block" />

              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger
                  aria-label="Category"
                  className="h-11 w-full border-0 shadow-none focus-visible:ring-0 sm:w-48"
                >
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {JOB_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                type="submit"
                className="h-11 shrink-0 bg-brand-600 px-6 text-white hover:bg-brand-700"
              >
                <SearchIcon className="size-4" />
                Search
              </Button>
            </form>
          </Reveal>

          {/* CTAs */}
          <Reveal animateOnMount delay={0.45}>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                asChild
                className="h-12 w-full bg-white px-6 text-base text-brand-700 hover:bg-blue-50 sm:w-auto"
              >
                <Link href="/jobs">
                  Browse All Jobs
                  <ArrowRightIcon className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-12 w-full border-white/40 bg-transparent px-6 text-base text-white hover:bg-white/10 hover:text-white sm:w-auto"
              >
                <Link href="/employer/jobs/new">
                  <BriefcaseIcon className="size-4" />
                  Post a Job
                </Link>
              </Button>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
