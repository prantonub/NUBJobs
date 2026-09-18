'use client';

import { FC, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { differenceInCalendarDays, format } from 'date-fns';
import {
  ArrowRightIcon,
  BadgeCheckIcon,
  BookmarkIcon,
  CalendarClockIcon,
  ClockIcon,
  MapPinIcon,
  UsersIcon,
  WalletIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CompanyLogo } from '@/components/ui/CompanyLogo';
import { SkillTag } from '@/components/ui/SkillTag';
import { cn, formatDate } from '@/lib/utils';

/* ── Types ────────────────────────────────────────────────────────────────── */

export interface JobCardEmployer {
  companyName?: string | null;
  logoUrl?: string | null;
  isVerified?: boolean | null;
}

/**
 * Data the card renders — a structural subset of a `GET /api/jobs` row, so the
 * full Prisma payload can be passed straight through. Every optional field
 * degrades to a sensible placeholder instead of breaking the layout.
 */
export interface JobCardJob {
  id: string;
  title: string;
  description?: string | null;
  /** Prisma `JobType` string (`FULL_TIME`, `INTERNSHIP`, …). */
  type?: string | null;
  location?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  deadline?: string | null;
  minCgpa?: number | null;
  skills?: string[] | null;
  /** Explicit career level; inferred from the title when omitted. */
  experienceLevel?: string | null;
  applicantCount?: number | null;
  createdAt: string;
  employer?: JobCardEmployer | null;
}

export interface JobCardProps {
  job: JobCardJob;
  /** `grid` (default) for the responsive card grid, `list` for a wide row. */
  view?: 'grid' | 'list';
  /** Bookmark state. Pass together with `onSave` to control it from the parent. */
  isSaved?: boolean;
  /** Called with the job id on bookmark toggle (makes `isSaved` controlled). */
  onSave?: (jobId: string) => void;
  className?: string;
}

/* ── Formatting helpers ────────────────────────────────────────────────────── */

/** How many skill chips fit before the "+N more" pill takes over. */
const MAX_SKILLS = 4;

const JOB_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  INTERNSHIP: 'Internship',
  CONTRACT: 'Contract',
  REMOTE: 'Remote',
  HYBRID: 'Hybrid',
};

const SENIOR_TITLE = /\b(senior|sr\.?|lead|principal|staff|head)\b/i;
const MID_TITLE = /\b(mid|mid-level|intermediate)\b/i;

/** "Full-time" / "Internship" — unknown enum values fall back to Full-time. */
function jobTypeLabel(type?: string | null): string {
  const key = (type ?? 'FULL_TIME').toUpperCase().replace(/[\s-]+/g, '_');
  return JOB_TYPE_LABELS[key] ?? 'Full-time';
}

/**
 * Career level shown next to the job type. The API stores no dedicated column,
 * so an explicit `experienceLevel` always wins; otherwise we infer it from the
 * title keywords and default to Entry Level — the level this portal targets.
 */
function careerLevel(job: JobCardJob): string {
  const explicit = job.experienceLevel?.trim();
  if (explicit) return explicit;

  const title = job.title ?? '';
  if (SENIOR_TITLE.test(title)) return 'Senior Level';
  if (MID_TITLE.test(title)) return 'Mid Level';
  return 'Entry Level';
}

/** 30000 → "30K", 32500 → "32.5K" — compact taka keeps the row scannable. */
function compactTaka(amount: number): string {
  if (Math.abs(amount) < 1000) return String(Math.round(amount));
  const thousands = Math.round((amount / 1000) * 10) / 10;
  return `${Number.isInteger(thousands) ? thousands : thousands.toFixed(1)}K`;
}

/** "BDT 30K – 45K" | "BDT 30K+" | "Up to BDT 45K" | `null` when unspecified. */
function formatSalaryRange(min?: number | null, max?: number | null): string | null {
  if (min != null && max != null) {
    return `BDT ${compactTaka(min)} – ${compactTaka(max)}`;
  }
  if (min != null) return `BDT ${compactTaka(min)}+`;
  if (max != null) return `Up to BDT ${compactTaka(max)}`;
  return null;
}

/**
 * "Oct 20" for open deadlines, flagged `urgent` inside three days and marked
 * `closed` once the date has passed. Returns `null` when no deadline is set.
 */
function formatDeadline(
  deadline?: string | null
): { label: string; urgent: boolean; closed: boolean } | null {
  if (!deadline) return null;

  const parsed = new Date(deadline);
  if (Number.isNaN(parsed.getTime())) return null;

  const daysLeft = differenceInCalendarDays(parsed, new Date());
  if (daysLeft < 0) return { label: 'Closed', urgent: false, closed: true };
  return { label: format(parsed, 'MMM d'), urgent: daysLeft <= 3, closed: false };
}

/* ── Building blocks ───────────────────────────────────────────────────────── */

/** Icon + text row shared by the location / salary / deadline list. */
function InfoRow({
  icon,
  className,
  children,
}: {
  icon: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <li className={cn('flex items-center gap-2 text-sm', className)}>
      <span className="shrink-0 text-muted-foreground/70" aria-hidden="true">
        {icon}
      </span>
      <span className="min-w-0 truncate">{children}</span>
    </li>
  );
}

/**
 * Minimal skill chips. Renders a height-reserving placeholder when a job lists
 * no skills, so cards in the same row keep an identical rhythm.
 */
function SkillList({ skills, className }: { skills: string[]; className?: string }) {
  if (skills.length === 0) {
    return <div className={cn('min-h-6', className)} aria-hidden="true" />;
  }

  const visible = skills.slice(0, MAX_SKILLS);
  const remaining = skills.length - visible.length;

  return (
    <ul className={cn('flex flex-wrap gap-1.5', className)}>
      {visible.map((skill) => (
        <li key={skill} className="min-w-0">
          <SkillTag className="bg-muted/70">{skill}</SkillTag>
        </li>
      ))}
      {remaining > 0 ? (
        <li>
          <SkillTag className="text-muted-foreground">+{remaining} more</SkillTag>
        </li>
      ) : null}
    </ul>
  );
}

/**
 * Bookmark toggle. Sits above the card's stretched link (`relative z-10`) so it
 * stays clickable, and reports its state through `aria-pressed`.
 */
function SaveButton({
  title,
  saved,
  onToggle,
  className,
}: {
  title: string;
  saved: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={onToggle}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${title} from saved jobs` : `Save ${title}`}
      title={saved ? 'Remove from saved jobs' : 'Save job'}
      className={cn(
        'relative z-10 shrink-0 rounded-full text-muted-foreground transition-colors',
        'hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-900/40',
        saved && 'text-brand-600 hover:text-brand-700',
        className
      )}
    >
      <BookmarkIcon className="size-4" fill={saved ? 'currentColor' : 'none'} aria-hidden="true" />
    </Button>
  );
}

/** Trust signal for admin-approved employers (`employer.isVerified`). */
function VerifiedBadge() {
  return (
    <span className="inline-flex shrink-0 items-center" title="Verified employer">
      <BadgeCheckIcon className="size-3.5 text-brand-600" aria-hidden="true" />
      <span className="sr-only">Verified employer</span>
    </span>
  );
}

/** Secondary footer info: how many students have applied so far. */
function ApplicantCount({ count }: { count?: number | null }) {
  if (!count || count <= 0) return null;

  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <UsersIcon className="size-3.5 shrink-0" aria-hidden="true" />
      {count} {count === 1 ? 'applicant' : 'applicants'}
    </p>
  );
}

/**
 * Primary call to action. `after:absolute after:inset-0` stretches the link over
 * the whole card (the card is the positioned ancestor), so the entire card is
 * clickable while the accessible link name stays explicit.
 */
function ViewJobLink({
  jobId,
  title,
  companyName,
  className,
}: {
  jobId: string;
  title: string;
  companyName: string;
  className?: string;
}) {
  return (
    <Link
      href={`/jobs/${jobId}`}
      aria-label={`View job: ${title} at ${companyName}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-semibold text-brand-600 transition-colors after:absolute after:inset-0 after:content-['']",
        'hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-900/40 dark:hover:text-brand-100',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/60 focus-visible:ring-offset-2 focus-visible:ring-offset-card',
        'group-hover/card:text-brand-700',
        className
      )}
    >
      View Job
      <ArrowRightIcon
        className="size-4 transition-transform duration-200 group-hover/card:translate-x-0.5 motion-reduce:transform-none"
        aria-hidden="true"
      />
    </Link>
  );
}

/**
 * Location, salary and deadline rows behind the divider. Always renders three
 * rows (with placeholders) so the card's information block is the same height
 * for every job.
 */
function JobInfoList({
  location,
  salary,
  deadline,
  className,
}: {
  location: string;
  salary: string | null;
  deadline: { label: string; urgent: boolean; closed: boolean } | null;
  className?: string;
}) {
  return (
    <ul className={cn('grid gap-2 border-t border-border pt-3.5', className)}>
      <InfoRow icon={<MapPinIcon className="size-4" />} className="text-muted-foreground">
        {location}
      </InfoRow>

      <InfoRow
        icon={<WalletIcon className="size-4" />}
        className={
          salary
            ? 'font-medium text-emerald-700 dark:text-emerald-400'
            : 'text-muted-foreground'
        }
      >
        {salary ?? 'Negotiable'}
        {salary ? (
          <span className="font-normal text-muted-foreground"> /month</span>
        ) : null}
      </InfoRow>

      <InfoRow
        icon={<CalendarClockIcon className="size-4" />}
        className={cn(
          'text-muted-foreground',
          deadline?.urgent && 'font-medium text-amber-700 dark:text-amber-400'
        )}
      >
        {deadline ? `Deadline: ${deadline.label}` : 'No deadline'}
      </InfoRow>
    </ul>
  );
}

/* ── Card ────────────────────────────────────────────────────────────────── */

/**
 * NUBJobs job listing card — employer chip, bold title, type/level meta, short
 * description, minimal skill chips and the location / salary / deadline block,
 * with a bookmark toggle and a "View Job" action that makes the whole card
 * clickable.
 *
 * Fully responsive on its own; drop it into a grid that goes
 * `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` for the 1 / 2 / 3 layout.
 *
 * @example
 * <JobCard job={job} />                                      // grid card
 * <JobCard job={job} view="list" />                          // wide list row
 * <JobCard job={job} isSaved={saved} onSave={toggleSave} />  // controlled bookmark
 */
const JobCard: FC<JobCardProps> = ({
  job,
  view = 'grid',
  isSaved = false,
  onSave,
  className,
}) => {
  const [localSaved, setLocalSaved] = useState(isSaved);

  // Controlled when the parent passes `onSave`, self-managed otherwise so the
  // bookmark still works on public listings that have no persistence hook yet.
  const isControlled = typeof onSave === 'function';
  const saved = isControlled ? isSaved : localSaved;

  const handleToggleSave = () => {
    if (!isControlled) setLocalSaved((previous) => !previous);
    onSave?.(job.id);
  };

  const skills = Array.isArray(job.skills) ? job.skills.filter(Boolean) : [];
  const companyName = job.employer?.companyName?.trim() || 'NUB Employer';
  const logoUrl = job.employer?.logoUrl;
  const isVerified = Boolean(job.employer?.isVerified);
  const postedLabel = formatDate(job.createdAt);
  const description = job.description?.trim();
  const locationLabel = job.location?.trim() || 'Location flexible';
  const salaryLabel = formatSalaryRange(job.salaryMin, job.salaryMax);
  const deadline = formatDeadline(job.deadline);

  const cardClassName = cn(
    'group/card relative h-full gap-0 p-0 shadow-xs ring-1 ring-foreground/10',
    'transition-all duration-200 ease-out',
    'hover:-translate-y-0.5 hover:shadow-md hover:shadow-foreground/5 hover:ring-brand-600/30',
    'focus-within:ring-2 focus-within:ring-brand-600/40',
    'motion-reduce:transform-none motion-reduce:transition-none',
    className
  );

  const saveButton = (
    <SaveButton title={job.title} saved={saved} onToggle={handleToggleSave} />
  );

  const metaLine = (
    <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted-foreground">
      <span>{jobTypeLabel(job.type)}</span>
      <span
        className="size-1 shrink-0 rounded-full bg-muted-foreground/50"
        aria-hidden="true"
      />
      <span>{careerLevel(job)}</span>
    </p>
  );

  const viewJobLink = (linkClassName: string) => (
    <ViewJobLink
      jobId={job.id}
      title={job.title}
      companyName={companyName}
      className={linkClassName}
    />
  );

  /* ── List layout ───────────────────────────────────────────────────────── */
  if (view === 'list') {
    return (
      <Card className={cn(cardClassName, 'sm:flex-row sm:items-stretch')}>
        <div className="flex min-w-0 flex-1 items-start gap-4 p-5">
          <CompanyLogo name={companyName} logoUrl={logoUrl} size="md" />

          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <h3
                  className="font-heading line-clamp-1 text-lg font-bold tracking-tight text-foreground"
                  title={job.title}
                >
                  {job.title}
                </h3>
                <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted-foreground">
                  <span className="truncate font-medium text-foreground/80">
                    {companyName}
                  </span>
                  {isVerified ? <VerifiedBadge /> : null}
                  <span
                    className="size-1 shrink-0 rounded-full bg-muted-foreground/50"
                    aria-hidden="true"
                  />
                  <time dateTime={job.createdAt} className="text-xs">
                    {postedLabel}
                  </time>
                </p>
                <div className="mt-1.5">{metaLine}</div>
              </div>
              {saveButton}
            </div>

            {description ? (
              <p className="mt-2.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            ) : null}

            <SkillList skills={skills} className="mt-3" />
          </div>
        </div>

        <div className="flex shrink-0 flex-col justify-center gap-4 border-t border-border bg-muted/40 p-5 sm:w-64 sm:border-l sm:border-t-0">
          <JobInfoList location={locationLabel} salary={salaryLabel} deadline={deadline} />
          {viewJobLink('self-start')}
        </div>
      </Card>
    );
  }

  /* ── Grid layout (default) ─────────────────────────────────────────────── */
  return (
    <Card className={cardClassName}>
      {/* Employer, posting status and save toggle */}
      <div className="flex items-start gap-3 px-5 pt-5">
        <CompanyLogo name={companyName} logoUrl={logoUrl} size="md" />

        <div className="min-w-0 flex-1 pt-0.5">
          <p className="flex min-w-0 items-center gap-1 text-sm font-semibold text-foreground">
            <span className="truncate" title={companyName}>
              {companyName}
            </span>
            {isVerified ? <VerifiedBadge /> : null}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <ClockIcon className="size-3.5 shrink-0" aria-hidden="true" />
            <time dateTime={job.createdAt}>{postedLabel}</time>
          </p>
        </div>

        {saveButton}
      </div>

      {/* Title, type · level, short description */}
      <div className="flex flex-1 flex-col px-5 pt-4">
        <h3
          className="font-heading line-clamp-2 break-words text-base font-bold leading-snug tracking-tight text-foreground"
          title={job.title}
        >
          {job.title}
        </h3>
        <div className="mt-1.5">{metaLine}</div>
        {description ? (
          <p className="mt-2.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>

      {/* Skill chips */}
      <SkillList skills={skills} className="mt-3 px-5" />

      {/* Location, salary and deadline */}
      <div className="mt-auto px-5 pb-4 pt-4">
        <JobInfoList location={locationLabel} salary={salaryLabel} deadline={deadline} />
      </div>

      {/* Bottom action */}
      <div className="flex items-center gap-3 border-t border-border bg-muted/40 px-5 py-3">
        <ApplicantCount count={job.applicantCount} />
        {viewJobLink('ml-auto')}
      </div>
    </Card>
  );
};

export default JobCard;
export { JobCard };
