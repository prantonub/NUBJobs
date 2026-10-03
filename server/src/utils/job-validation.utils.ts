import { z } from 'zod';

/**
 * Shared job-posting validation.
 *
 * Browsers submit `<input>` values as **strings** (`"30000"`, `"3.5"`,
 * `"2026-10-15"`), so strict `z.number()` / `z.string().datetime()` schemas
 * rejected every realistic form submission with "Validation failed".
 * These helpers coerce form input while keeping the spec's value ranges, and
 * treat an empty field as "not provided".
 */

/** `""` / `null` / `undefined` → `undefined`; numeric strings → numbers. */
export function coerceOptionalNumber(schema: z.ZodTypeAny) {
  return z.preprocess((value) => {
    if (value === '' || value === null || value === undefined) return undefined;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed === '') return undefined;
      const parsed = Number(trimmed);
      // Keep the raw value when it is not numeric so the schema reports the type error.
      return Number.isFinite(parsed) ? parsed : value;
    }
    return value;
  }, schema.optional());
}

/** Empty string → `undefined` (so optional text is not saved as `""`). */
export function coerceOptionalString(schema: z.ZodTypeAny) {
  return z.preprocess((value) => {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'string' && value.trim() === '') return undefined;
    return value;
  }, schema.optional());
}

/**
 * Deadline accepts what a `<input type="date">` produces (`2026-10-15`) or a
 * full ISO timestamp; date-only values are anchored to the end of that day.
 */
export const deadlineSchema = z.preprocess((value) => {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (trimmed === '') return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return `${trimmed}T23:59:59.000Z`;
  return trimmed;
}, z.string().datetime({ message: 'Deadline must be a valid date' }).optional());

/** Skills: trim, drop blanks and duplicates; requires at least one real skill. */
export const skillsSchema = z.preprocess(
  (value) => {
    if (!Array.isArray(value)) return value;
    const cleaned = value
      .filter((skill): skill is string => typeof skill === 'string')
      .map((skill) => skill.trim())
      .filter(Boolean);
    return Array.from(new Set(cleaned));
  },
  z
    .array(z.string().min(1).max(40))
    .min(1, 'At least one skill is required')
    .max(30, 'Too many skills (max 30)')
);

export const JOB_TYPES = [
  'FULL_TIME',
  'PART_TIME',
  'INTERNSHIP',
  'CONTRACT',
  'REMOTE',
  'HYBRID',
] as const;

export const jobTypeSchema = z.enum(JOB_TYPES);

/** Spec ranges: salary positive, CGPA 0-4. */
export const positiveSalarySchema = coerceOptionalNumber(
  z.number().int('Salary must be a whole number').positive('Salary must be positive').max(100_000_000)
);

export const cgpaSchema = coerceOptionalNumber(
  z.number().min(0, 'CGPA cannot be negative').max(4, 'CGPA cannot exceed 4.0')
);

export const titleSchema = z
  .string()
  .trim()
  .min(10, 'Title must be at least 10 characters')
  .max(200, 'Title must be at most 200 characters');

export const descriptionSchema = z
  .string()
  .trim()
  .min(50, 'Description must be at least 50 characters')
  .max(5000, 'Description must be at most 5000 characters');

/** Body shared by POST /api/jobs and POST /api/employer/jobs. */
export const createJobSchema = z.object({
  title: titleSchema,
  description: descriptionSchema,
  category: coerceOptionalString(z.string().max(60)),
  type: jobTypeSchema,
  location: coerceOptionalString(z.string().max(120)),
  salaryMin: positiveSalarySchema,
  salaryMax: positiveSalarySchema,
  minCgpa: cgpaSchema,
  skills: skillsSchema,
  deadline: deadlineSchema,
  targetUniversity: z.enum(['ALL', 'NUB', 'OTHER']).optional(),
});

/** Body for editing a DRAFT/PENDING posting (everything optional). */
export const updateJobSchema = z.object({
  title: titleSchema.optional(),
  description: descriptionSchema.optional(),
  category: coerceOptionalString(z.string().max(60)),
  type: jobTypeSchema.optional(),
  location: coerceOptionalString(z.string().max(120)),
  salaryMin: positiveSalarySchema,
  salaryMax: positiveSalarySchema,
  minCgpa: cgpaSchema,
  skills: z.preprocess(
    (value) => {
      if (value === undefined) return undefined;
      if (!Array.isArray(value)) return value;
      const cleaned = value
        .filter((skill): skill is string => typeof skill === 'string')
        .map((skill) => skill.trim())
        .filter(Boolean);
      return Array.from(new Set(cleaned));
    },
    z.array(z.string().min(1).max(40)).optional()
  ),
  deadline: deadlineSchema,
  targetUniversity: z.enum(['ALL', 'NUB', 'OTHER']).optional(),
});

/**
 * Human-readable validation errors, e.g.
 * `{ salaryMin: "Salary must be positive" }`.
 */
export function formatZodErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.') || 'form';
    if (!errors[path]) errors[path] = issue.message;
  }
  return errors;
}