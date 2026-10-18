import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export type CheckStatus = 'pass' | 'warn' | 'fail';

export interface CvCheckItem {
  id: string;
  label: string;
  status: CheckStatus;
  tip: string;
}

/** Score weights — must sum to 100. */
const WEIGHTS: Record<string, number> = {
  readable: 15,
  contact: 12,
  headings: 10,
  skills: 10,
  noImages: 8,
  singleColumn: 8,
  length: 10,
  dates: 9,
  measurable: 9,
  dateFormat: 9,
} as const;

const STATUS_POINTS: Record<CheckStatus, number> = { pass: 1, warn: 0.5, fail: 0 };

const SECTION_ALIASES: Record<string, string[]> = {
  education: ['education', 'academic', 'qualification'],
  experience: ['experience', 'employment', 'work history', 'work experience', 'internship'],
  skills: ['skill', 'technical skill', 'competenc'],
  projects: ['project', 'portfolio'],
};

export const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'else', 'when', 'at', 'by',
  'for', 'with', 'about', 'into', 'through', 'during', 'before', 'after', 'above',
  'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under',
  'again', 'further', 'once', 'here', 'there', 'all', 'any', 'both', 'each', 'few',
  'more', 'most', 'other', 'some', 'such', 'only', 'own', 'same', 'than', 'too',
  'very', 'can', 'will', 'just', 'should', 'now', 'is', 'are', 'was', 'were', 'be',
  'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing',
  'would', 'could', 'ought', 'we', 'you', 'they', 'them', 'their', 'this', 'that',
  'these', 'those', 'am', 'it', 'its', 'of', 'as', 'not', 'no', 'yes', 'per', 'via',
  'within', 'without', 'between', 'among', 'including', 'required', 'preferred',
  'plus', 'join', 'team', 'role', 'job', 'work', 'candidate', 'who', 'what',
  'which', 'where', 'how', 'why', 'our', 'your', 'looking', 'seeking', 'hiring',
  'opportunity', 'apply',
]);

/** Extract plain text from an in-memory upload. 422 for scanned-image PDFs. */
export async function parseCv(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === 'application/pdf') {
    const parsed = await pdfParse(buffer);
    const text = (parsed.text ?? '').trim();
    if (text.replace(/\s/g, '').length < 50) {
      const err = new Error(
        'This looks like a scanned image. Export a text-based PDF.'
      ) as Error & { statusCode: number };
      err.statusCode = 422;
      throw err;
    }
    return text;
  }
  if (
    mimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword'
  ) {
    const result = await mammoth.extractRawText({ buffer });
    const text = (result.value ?? '').trim();
    if (text.replace(/\s/g, '').length < 50) {
      const err = new Error('Could not read any text from this document.') as Error & {
        statusCode: number;
      };
      err.statusCode = 422;
      throw err;
    }
    return text;
  }
  const err = new Error('Only PDF and DOCX files are supported.') as Error & {
    statusCode: number;
  };
  err.statusCode = 400;
  throw err;
}


const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_RE = /(\+?\d[\d\s\-().]{7,}\d)/;
const DATE_RE =
  /\b(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}|\d{4}[/\-.]\d{1,2}|(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{4}|\d{4}\s*[-–—to]+\s*(\d{4}|present|current))/gi;
const NUMBER_RE = /\d+\s?(%|percent|\+|x\b)?|\$\s?\d+|৳\s?\d+/i;

function sectionFound(lower: string, key: string): boolean {
  const lines = lower.split('\n');
  return (SECTION_ALIASES[key] ?? []).some((alias) =>
    lines.some((line) => line.trim().length < 60 && line.includes(alias))
  );
}

function looksTwoColumn(text: string): boolean {
  const lines = text.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length < 10) return false;
  const wide = lines.filter((l) => l.length > 140).length;
  return wide / lines.length > 0.35;
}

function looksTabular(text: string): boolean {
  const lines = text.split('\n');
  const tabby = lines.filter(
    (l) => (l.match(/\t/g) ?? []).length >= 2 || (l.match(/ {4,}/g) ?? []).length >= 2
  ).length;
  return lines.length > 5 && tabby / lines.length > 0.25;
}


/** Plain-text ATS readiness analysis. Score is a weighted 0–100 of the checks. */
export function analyzeCv(rawText: string): { score: number; checks: CvCheckItem[] } {
  const text = rawText.replace(/\r/g, '');
  const lower = text.toLowerCase();
  const checks: CvCheckItem[] = [];

  const charCount = text.replace(/\s/g, '').length;
  checks.push({
    id: 'readable',
    label: 'File readable as text (not a scanned image)',
    status: charCount >= 300 ? 'pass' : charCount >= 50 ? 'warn' : 'fail',
    tip: 'Export your CV as a text-based PDF from Word or Google Docs.',
  });

  const hasEmail = EMAIL_RE.test(text);
  const hasPhone = PHONE_RE.test(text);
  checks.push({
    id: 'contact',
    label: 'Contact info found (email, phone)',
    status: hasEmail && hasPhone ? 'pass' : hasEmail || hasPhone ? 'warn' : 'fail',
    tip: hasEmail
      ? 'Add a phone number with country code next to your email at the top.'
      : 'Put your email address (and phone number) in plain text at the very top.',
  });

  const keys = Object.keys(SECTION_ALIASES);
  const foundSections = keys.filter((s) => sectionFound(lower, s));
  checks.push({
    id: 'headings',
    label: 'Standard section headings (Education, Experience, Skills, Projects)',
    status: foundSections.length >= 3 ? 'pass' : foundSections.length === 2 ? 'warn' : 'fail',
    tip: 'Use exact headings like Education, Experience, Skills and Projects.',
  });

  const skillsPresent = sectionFound(lower, 'skills');
  checks.push({
    id: 'skills',
    label: 'Skills section present',
    status: skillsPresent ? 'pass' : 'fail',
    tip: 'Add a Skills section listing tools you actually use, separated by commas.',
  });

  const imageHints = /(image|photo|logo|icon|graphic|headshot)/i.test(lower);
  checks.push({
    id: 'noImages',
    label: 'No images or icons detected in the text layer',
    status: imageHints ? 'warn' : 'pass',
    tip: 'Remove photos, logos and icons — tracking systems ignore them.',
  });

  const multiCol = looksTwoColumn(text) || looksTabular(text);
  checks.push({
    id: 'singleColumn',
    label: 'No multi-column or table layout detected (heuristic)',
    status: multiCol ? 'warn' : 'pass',
    tip: 'Switch to a simple one-column layout with no tables or text boxes.',
  });

  const words = text.split(/\s+/).filter(Boolean).length;
  const estPages = words / 550;
  checks.push({
    id: 'length',
    label: 'Length: 1 page for students (warn above 1 page, fail above 2)',
    status: estPages <= 1.15 ? 'pass' : estPages <= 2.1 ? 'warn' : 'fail',
    tip: 'Trim to one page: keep the strongest bullets, cut outdated items.',
  });

  const dates = text.match(DATE_RE) ?? [];
  checks.push({
    id: 'dates',
    label: 'Dates present in experience and education',
    status: dates.length >= 3 ? 'pass' : dates.length >= 1 ? 'warn' : 'fail',
    tip: 'Add start and end dates (e.g. Jan 2024 – Jun 2024) to every role.',
  });

  const bullets = text.split('\n').filter((l) => /^[\s]*[•\-*–—]/.test(l));
  const withNumbers = bullets.filter((b) => NUMBER_RE.test(b)).length;
  const ratio = bullets.length === 0 ? 0 : withNumbers / bullets.length;
  checks.push({
    id: 'measurable',
    label: 'Measurable results (numbers or percentages in bullet points)',
    status: ratio >= 0.3 && withNumbers >= 2 ? 'pass' : withNumbers >= 1 ? 'warn' : 'fail',
    tip: 'Add numbers to two bullets, e.g. "cut load time by 30%".',
  });

  const dateFormats = new Set(
    dates.map((d) =>
      /\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}/.test(d)
        ? 'numeric'
        : /(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)/i.test(d)
          ? 'month'
          : 'other'
    )
  );
  checks.push({
    id: 'dateFormat',
    label: 'Consistent date format',
    status: dates.length === 0 ? 'fail' : dateFormats.size <= 1 ? 'pass' : 'warn',
    tip: 'Pick one date style (e.g. "Jan 2024") and use it everywhere.',
  });

  let earned = 0;
  let possible = 0;
  for (const c of checks) {
    const w = WEIGHTS[c.id] ?? 0;
    possible += w;
    earned += w * STATUS_POINTS[c.status];
  }
  const score = possible === 0 ? 0 : Math.round((earned / possible) * 100);
  return { score, checks };
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s]/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim().replace(/^[#.]+|[#.]+$/g, ''))
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t));
}

/** Keyword-overlap match between CV text and a job description. */
export function matchJob(
  cvText: string,
  jobText: string
): { matchScore: number; matched: string[]; missing: string[] } {
  const jobTokens = tokenize(jobText);
  const freq = new Map<string, number>();
  for (const t of jobTokens) freq.set(t, (freq.get(t) ?? 0) + 1);
  const keywords = [...freq.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([t]) => t)
    .slice(0, 40);

  const cvSet = new Set(tokenize(cvText));
  const matched: string[] = [];
  const missing: string[] = [];
  for (const k of keywords) {
    if (cvSet.has(k)) matched.push(k);
    else missing.push(k);
  }
  const matchScore =
    keywords.length === 0 ? 0 : Math.round((matched.length / keywords.length) * 100);
  return { matchScore, matched, missing };
}
