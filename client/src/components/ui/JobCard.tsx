"use client";

import Link from "next/link";
import { BookmarkIcon, CalendarIcon, MapPinIcon } from "lucide-react";
import { differenceInCalendarDays } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CompanyLogo } from "@/components/ui/CompanyLogo";
import { SkillTag } from "@/components/ui/SkillTag";
import { cn, formatDate, formatSalary } from "@/lib/utils";

export type JobType =
  | "FULL_TIME"
  | "PART_TIME"
  | "INTERNSHIP"
  | "REMOTE"
  | "HYBRID";

const TYPE_LABELS: Record<JobType, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  INTERNSHIP: "Internship",
  REMOTE: "Remote",
  HYBRID: "Hybrid",
};

const TYPE_STYLES: Record<JobType, string> = {
  FULL_TIME:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300",
  PART_TIME:
    "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-900 dark:bg-cyan-950 dark:text-cyan-300",
  INTERNSHIP:
    "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900 dark:bg-purple-950 dark:text-purple-300",
  REMOTE:
    "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300",
  HYBRID:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
};

export interface JobCardProps {
  id: string;
  title: string;
  companyName: string;
  companyLogo?: string | null;
  type: JobType;
  location?: string;
  salaryMin?: number;
  salaryMax?: number;
  skills: string[];
  deadline?: string;
  matchScore?: number;
  isSaved?: boolean;
  minCgpa?: number;
  postedAt: string;
  onSave?: (id: string) => void;
  className?: string;
}

function DeadlineBadge({ deadline }: { deadline: string }) {
  const days = differenceInCalendarDays(new Date(deadline), new Date());

  if (days < 0) {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-border bg-muted text-muted-foreground"
      >
        <CalendarIcon className="size-3" />
        Closed
      </Badge>
    );
  }

  const urgent = days <= 3;
  const label =
    days === 0 ? "Due today" : days === 1 ? "1 day left" : `${days} days left`;

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1",
        urgent
          ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
          : "border-border bg-muted text-muted-foreground"
      )}
    >
      <CalendarIcon className="size-3" />
      {label}
    </Badge>
  );
}

/**
 * Job listing card: company logo, linked title, salary/type/CGPA/deadline
 * badges, skill tags (max 3 + overflow), a circular match-score badge, posted
 * date, and a save/bookmark toggle.
 */
export function JobCard({
  id,
  title,
  companyName,
  companyLogo,
  type,
  location,
  salaryMin,
  salaryMax,
  skills,
  deadline,
  matchScore,
  isSaved = false,
  minCgpa,
  postedAt,
  onSave,
  className,
}: JobCardProps) {
  const hasSalary = salaryMin != null || salaryMax != null;
  const showMatch = typeof matchScore === "number" && matchScore > 0;

  return (
    <Card
      className={cn(
        "animate-fade-in transition-shadow hover:shadow-lg",
        className
      )}
    >
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <CompanyLogo name={companyName} logoUrl={companyLogo} size="md" />

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link
                  href={`/jobs/${id}`}
                  className="font-heading line-clamp-1 font-semibold text-foreground transition-colors hover:text-brand-600 hover:underline"
                >
                  {title}
                </Link>
                <p className="truncate text-sm text-muted-foreground">
                  {companyName}
                </p>
              </div>

              {showMatch ? (
                <div
                  title={`${matchScore}% skills match`}
                  className="flex size-11 shrink-0 flex-col items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm"
                >
                  <span className="text-sm font-bold leading-none">
                    {matchScore}%
                  </span>
                  <span className="text-[9px] leading-none opacity-90">
                    match
                  </span>
                </div>
              ) : null}
            </div>

            {location ? (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPinIcon className="size-3.5" />
                {location}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasSalary ? (
            <Badge
              variant="outline"
              className="border-green-200 bg-green-50 font-medium text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
            >
              {formatSalary(salaryMin, salaryMax)}
            </Badge>
          ) : null}
          <Badge variant="outline" className={cn("font-medium", TYPE_STYLES[type])}>
            {TYPE_LABELS[type]}
          </Badge>
          {minCgpa != null ? (
            <Badge
              variant="outline"
              className="border-amber-200 bg-amber-50 font-medium text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300"
            >
              CGPA {minCgpa}+
            </Badge>
          ) : null}
          {deadline ? <DeadlineBadge deadline={deadline} /> : null}
        </div>

        {skills.length ? (
          <div className="flex flex-wrap gap-1.5">
            {skills.slice(0, 3).map((skill) => (
              <SkillTag key={skill} variant="primary">
                {skill}
              </SkillTag>
            ))}
            {skills.length > 3 ? (
              <SkillTag>+{skills.length - 3} more</SkillTag>
            ) : null}
          </div>
        ) : null}

        <div className="flex items-center justify-between border-t border-border pt-3">
          <span className="text-xs text-muted-foreground">
            {formatDate(postedAt)}
          </span>
          {onSave ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={isSaved ? "Remove from saved jobs" : "Save job"}
              aria-pressed={isSaved}
              onClick={() => onSave(id)}
              className={
                isSaved ? "text-brand-600" : "text-muted-foreground"
              }
            >
              <BookmarkIcon
                className="size-4"
                fill={isSaved ? "currentColor" : "none"}
              />
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
