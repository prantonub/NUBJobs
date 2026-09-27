/**
 * Application-lifecycle helpers shared by the student and employer controllers.
 */

export const APPLICATION_STATUSES = [
  'APPLIED',
  'REVIEWED',
  'SHORTLISTED',
  'INTERVIEWED',
  'HIRED',
  'REJECTED',
  'WITHDRAWN',
] as const;

export type ApplicationStatusValue = (typeof APPLICATION_STATUSES)[number];

/** Statuses an employer can set from the pipeline / detail page. */
export const EMPLOYER_SETTABLE_STATUSES: ApplicationStatusValue[] = [
  'REVIEWED',
  'SHORTLISTED',
  'INTERVIEWED',
  'HIRED',
  'REJECTED',
];

/** Nothing can move an application out of these. */
export const TERMINAL_STATUSES: ApplicationStatusValue[] = ['HIRED', 'REJECTED', 'WITHDRAWN'];

/**
 * Allowed pipeline moves: forward steps plus the terminal "reject" from any
 * live stage — never backwards into an earlier stage.
 */
export const PIPELINE_TRANSITIONS: Record<ApplicationStatusValue, ApplicationStatusValue[]> = {
  APPLIED: ['REVIEWED', 'SHORTLISTED', 'REJECTED'],
  REVIEWED: ['SHORTLISTED', 'INTERVIEWED', 'REJECTED'],
  SHORTLISTED: ['INTERVIEWED', 'HIRED', 'REJECTED'],
  INTERVIEWED: ['HIRED', 'REJECTED'],
  HIRED: [],
  REJECTED: [],
  WITHDRAWN: [],
};

export function isApplicationStatus(value: unknown): value is ApplicationStatusValue {
  return typeof value === 'string' && (APPLICATION_STATUSES as readonly string[]).includes(value);
}

/** `null` when the move is allowed, otherwise a human readable reason. */
export function validateStatusTransition(
  from: ApplicationStatusValue,
  to: ApplicationStatusValue
): string | null {
  if (from === to) return `Application is already ${to}`;

  const allowed = PIPELINE_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    return `Invalid transition: ${from} → ${to}. Allowed: ${allowed.join(', ') || 'none (terminal state)'}`;
  }

  return null;
}

export interface ApplicationForTimeline {
  status: string;
  createdAt: Date;
  updatedAt: Date;
  reviewedAt?: Date | null;
  interviewDate?: Date | null;
  interviewLink?: string | null;
}

export interface TimelineStep {
  key: string;
  label: string;
  /** Whether the application has reached this stage. */
  reached: boolean;
  /** Best-known timestamp for the stage (null while unreached). */
  at: Date | null;
  /** Set for the single stage the application is currently sitting in. */
  current: boolean;
}

const FORWARD_ORDER: ApplicationStatusValue[] = ['APPLIED', 'REVIEWED', 'SHORTLISTED', 'INTERVIEWED', 'HIRED'];

const STEP_LABELS: Record<string, string> = {
  APPLIED: 'Applied',
  REVIEWED: 'Reviewed',
  SHORTLISTED: 'Shortlisted',
  INTERVIEWED: 'Interviewed',
  HIRED: 'Hired',
  REJECTED: 'Rejected',
};

/**
 * Status timeline rendered on both application detail pages.
 *
 * `reviewedAt` and `interviewDate` have dedicated columns; the intermediate
 * stages reuse `updatedAt` (the last write was the stage change), which keeps
 * the timeline accurate without a status-history table.
 */
export function buildApplicationTimeline(application: ApplicationForTimeline): TimelineStep[] {
  const currentIndex = FORWARD_ORDER.indexOf(application.status as ApplicationStatusValue);
  const rejected = application.status === 'REJECTED';
  const withdrawn = application.status === 'WITHDRAWN';

  const steps = FORWARD_ORDER.map((key, index) => {
    let at: Date | null = null;

    if (key === 'APPLIED') at = application.createdAt;
    else if (key === 'REVIEWED') at = application.reviewedAt ?? null;
    else if (key === 'INTERVIEWED') at = application.interviewDate ?? null;

    const reached = rejected || withdrawn ? index === 0 : index <= currentIndex;
    // Stage timestamps we cannot derive individually fall back to the last write.
    if (reached && !at) at = index === 0 ? application.createdAt : application.updatedAt;

    return {
      key,
      label: STEP_LABELS[key],
      reached,
      at,
      current: !rejected && !withdrawn && index === currentIndex,
    };
  });

  if (rejected) {
    steps.push({
      key: 'REJECTED',
      label: STEP_LABELS.REJECTED,
      reached: true,
      at: application.updatedAt,
      current: true,
    });
  }

  if (withdrawn) {
    steps.push({
      key: 'WITHDRAWN',
      label: 'Withdrawn',
      reached: true,
      at: application.updatedAt,
      current: true,
    });
  }

  return steps;
}
