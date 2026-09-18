/**
 * Match scoring shared by every surface that shows a "match %"
 * (`GET /api/jobs`, `/jobs/:id`, `/jobs/recommended`, and the `matchScore`
 * persisted on each Application).
 *
 * Keeping one implementation means a student never sees "82% match" on a card
 * and a different number in the apply modal or on their application record.
 *
 * Formula (skills 70% + CGPA 30%), degrading gracefully:
 *   - job has skills and/or a minCgpa requirement -> weighted blend
 *   - job has only skills   -> 100% skills overlap
 *   - job has only minCgpa  -> 100% CGPA fit
 *   - job has neither       -> 0 (nothing to match against)
 * Matching is case/whitespace-insensitive because skills are free-text.
 */

export interface MatchStudent {
  skills?: string[] | null;
  cgpa?: number | null;
}

export interface MatchJob {
  skills?: string[] | null;
  minCgpa?: number | null;
}

const WEIGHT_SKILLS = 0.7;
const WEIGHT_CGPA = 0.3;

/** Skills the student has that the job asks for (order follows the job). */
export function matchedSkills(student: MatchStudent, job: MatchJob): string[] {
  const owned = new Set(
    (student.skills ?? []).map((skill) => String(skill).trim().toLowerCase()).filter(Boolean)
  );

  return (job.skills ?? []).filter((skill) => owned.has(String(skill).trim().toLowerCase()));
}

/** Skills the job asks for that the student does not have. */
export function missingSkills(student: MatchStudent, job: MatchJob): string[] {
  const matched = new Set(matchedSkills(student, job).map((s) => s.trim().toLowerCase()));
  return (job.skills ?? []).filter((skill) => !matched.has(String(skill).trim().toLowerCase()));
}

/**
 * CGPA fit as a 0-100 score.
 * Meeting the requirement scores 100; falling short scales down against the
 * gap (a 3.0 student against a 4.0 requirement scores 50).
 */
export function cgpaScore(student: MatchStudent, job: MatchJob): number | null {
  if (job.minCgpa === null || job.minCgpa === undefined || job.minCgpa <= 0) return null;

  if (student.cgpa === null || student.cgpa === undefined) return 0;
  if (student.cgpa >= job.minCgpa) return 100;

  return Math.max(0, Math.round((student.cgpa / job.minCgpa) * 100));
}

/**
 * Overall match score, 0-100 (integer).
 */
export function calculateMatchScore(student: MatchStudent, job: MatchJob): number {
  const jobSkills = (job.skills ?? []).filter((skill) => String(skill).trim() !== '');
  const skillFit =
    jobSkills.length > 0 ? (matchedSkills(student, job).length / jobSkills.length) * 100 : null;
  const gradeFit = cgpaScore(student, job);

  let score: number;
  if (skillFit !== null && gradeFit !== null) {
    score = skillFit * WEIGHT_SKILLS + gradeFit * WEIGHT_CGPA;
  } else if (skillFit !== null) {
    score = skillFit;
  } else if (gradeFit !== null) {
    score = gradeFit;
  } else {
    score = 0;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Full breakdown for the apply modal / job detail skills checklist.
 */
export function matchBreakdown(student: MatchStudent, job: MatchJob) {
  const skills = job.skills ?? [];

  return {
    matchScore: calculateMatchScore(student, job),
    matchedSkills: matchedSkills(student, job),
    missingSkills: missingSkills(student, job),
    totalSkills: skills.length,
    cgpaRequired: job.minCgpa ?? null,
    cgpa: student.cgpa ?? null,
    meetsCgpa:
      job.minCgpa === null || job.minCgpa === undefined ? null : (student.cgpa ?? 0) >= job.minCgpa,
    /** Per-skill checklist rendered as ✅ / ❌ in the UI. */
    skillChecklist: skills.map((skill) => ({
      skill,
      has: matchedSkills(student, job).some(
        (m) => m.trim().toLowerCase() === String(skill).trim().toLowerCase()
      ),
    })),
  };
}
