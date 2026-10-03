'use client';

import type { AxiosError } from 'axios';

/** Raw values coming out of the wizard's inputs (all strings). */
export interface JobFormValues {
  title: string;
  type: string;
  location: string;
  salaryMin: string;
  salaryMax: string;
  category: string;
  description: string;
  minCgpa: string;
  skills: string[];
  deadline: string;
  targetUniversity: string;
}

/**
 * Payload the API expects (numbers, ISO datetime, trimmed text).
 * The index signature lets the object flow straight into the generic mutation
 * hooks (`Record<string, unknown>`) without casts, while the named fields stay
 * typed for the client-side validator.
 */
export interface JobPayload {
  [key: string]: unknown;
  title: string;
  description: string;
  type: string;
  category?: string;
  location?: string;
  salaryMin?: number;
  salaryMax?: number;
  minCgpa?: number;
  skills: string[];
  deadline?: string;
  targetUniversity?: string;
}

/** `"30000"` → `30000`; `""`/whitespace → `undefined` (field not provided). */
export function toOptionalNumber(value: string): number | undefined {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * `<input type="date">` yields `YYYY-MM-DD`; the API expects a full ISO
 * timestamp, anchored to the end of the selected day.
 */
export function toIsoDeadline(value: string): string | undefined {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}T23:59:59`).toISOString();
  }
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

/**
 * Normalise the wizard form into an API-ready payload.
 *
 * The form keeps every field as a string (that is what inputs give us) while
 * the API validates numbers/dates, so converting here is what prevents
 * "Validation failed: expected number, received string".
 */
export function buildJobPayload(values: JobFormValues): JobPayload {
  return {
    title: values.title.trim(),
    description: values.description.trim(),
    type: values.type,
    category: values.category.trim() || undefined,
    location: values.location.trim() || undefined,
    salaryMin: toOptionalNumber(values.salaryMin),
    salaryMax: toOptionalNumber(values.salaryMax),
    minCgpa: toOptionalNumber(values.minCgpa),
    skills: values.skills.map((skill) => skill.trim()).filter(Boolean),
    deadline: toIsoDeadline(values.deadline),
    targetUniversity: values.targetUniversity || 'ALL',
  };
}

/** Client-side mirror of the API rules, so errors appear before the request. */
export function validateJobPayload(payload: JobPayload): Record<string, string> {
  const errors: Record<string, string> = {};

  if (payload.title.length < 10) errors.title = 'Title must be at least 10 characters';
  else if (payload.title.length > 200) errors.title = 'Title must be at most 200 characters';

  if (payload.description.length < 50) errors.description = 'Description must be at least 50 characters';
  else if (payload.description.length > 5000) errors.description = 'Description must be at most 5000 characters';

  if (payload.skills.length === 0) errors.skills = 'Add at least one required skill';
  if (!payload.type) errors.type = 'Job type is required';

  if (payload.salaryMin !== undefined && payload.salaryMin <= 0) {
    errors.salaryMin = 'Minimum salary must be greater than 0';
  }
  if (payload.salaryMax !== undefined && payload.salaryMax <= 0) {
    errors.salaryMax = 'Maximum salary must be greater than 0';
  }
  if (
    payload.salaryMin !== undefined &&
    payload.salaryMax !== undefined &&
    payload.salaryMax < payload.salaryMin
  ) {
    errors.salaryMax = 'Maximum salary cannot be lower than the minimum';
  }
  if (payload.minCgpa !== undefined && (payload.minCgpa < 0 || payload.minCgpa > 4)) {
    errors.minCgpa = 'CGPA must be between 0 and 4.0';
  }

  return errors;
}

/**
 * Pull per-field validation errors out of an API response
 * (`{ message: 'Validation failed', data: { title: '…' } }`).
 */
export function readValidationErrors(error: unknown): Record<string, string> {
  const axiosError = error as AxiosError<{
    data?: Record<string, string>;
    message?: string;
    error?: string;
  }>;

  const payload = axiosError?.response?.data;
  if (payload?.data && typeof payload.data === 'object') {
    const entries = Object.entries(payload.data).filter(([, message]) => typeof message === 'string');
    if (entries.length > 0) return Object.fromEntries(entries);
  }

  const message = payload?.message || payload?.error;
  return message ? { form: message } : {};
}

/** First available error, for a toast title. */
export function firstError(errors: Record<string, string>): string {
  const [field, message] = Object.entries(errors)[0] ?? [];
  if (!message) return 'Failed to save the job';
  return field === 'form' ? message : `${field}: ${message}`;
}