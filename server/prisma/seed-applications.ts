/**
 * Demo seed for the job-application + employer-management flows.
 *
 * Creates:
 *   - 5 verified employers (Brain Station 23, BJIT, Shajgoj, Pathao, Shohoz)
 *   - 6 job postings each (30 jobs)
 *   - 16 students with skills + CGPA + resume
 *   - 80 applications: APPLIED 20 · REVIEWED 15 · SHORTLISTED 12 ·
 *     INTERVIEWED 10 · HIRED 5 · REJECTED 18
 *   - message threads on a few applications
 *
 * Idempotent: replaces the applications of these demo jobs and upserts every
 * user/job, so it can be re-run in development.
 *
 * Usage: npm run prisma:seed:applications
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import prisma from '../src/lib/prisma';
import { calculateMatchScore } from '../src/utils/match.utils';

const PASSWORD = process.env.SEED_ACCOUNT_PASSWORD ?? 'Password123!';
const RESUME_URL =
  'https://res.cloudinary.com/demo/image/upload/v1/nubjobs/resumes/demo-resume.pdf';

type JobTypeValue = 'FULL_TIME' | 'PART_TIME' | 'INTERNSHIP' | 'CONTRACT' | 'REMOTE' | 'HYBRID';

interface JobTemplate {
  title: string;
  category: string;
  type: JobTypeValue;
  minCgpa: number;
  salaryMin: number;
  salaryMax: number;
  skills: string[];
  location: string;
}

const JOB_TEMPLATES: JobTemplate[] = [
  {
    title: 'Frontend Engineer (React)',
    category: 'Software Engineering',
    type: 'FULL_TIME',
    minCgpa: 3.0,
    salaryMin: 35000,
    salaryMax: 60000,
    skills: ['React', 'TypeScript', 'Redux', 'Tailwind CSS'],
    location: 'Dhaka',
  },
  {
    title: 'Backend Engineer (Node.js)',
    category: 'Software Engineering',
    type: 'FULL_TIME',
    minCgpa: 3.2,
    salaryMin: 40000,
    salaryMax: 70000,
    skills: ['Node.js', 'Express', 'PostgreSQL', 'Prisma'],
    location: 'Dhaka',
  },
  {
    title: 'Data Analyst Intern',
    category: 'Data Science',
    type: 'INTERNSHIP',
    minCgpa: 3.0,
    salaryMin: 12000,
    salaryMax: 18000,
    skills: ['Python', 'Pandas', 'SQL', 'Excel'],
    location: 'Remote',
  },
  {
    title: 'Mobile App Developer (Flutter)',
    category: 'Software Engineering',
    type: 'FULL_TIME',
    minCgpa: 3.0,
    salaryMin: 35000,
    salaryMax: 65000,
    skills: ['Flutter', 'Dart', 'REST API', 'Firebase'],
    location: 'Dhaka',
  },
  {
    title: 'DevOps Engineer',
    category: 'Software Engineering',
    type: 'FULL_TIME',
    minCgpa: 3.25,
    salaryMin: 50000,
    salaryMax: 90000,
    skills: ['Docker', 'Kubernetes', 'AWS', 'CI/CD'],
    location: 'Dhaka',
  },
  {
    title: 'Product Designer (UI/UX)',
    category: 'Design',
    type: 'PART_TIME',
    minCgpa: 2.75,
    salaryMin: 25000,
    salaryMax: 45000,
    skills: ['Figma', 'Wireframing', 'User Research', 'Prototyping'],
    location: 'Hybrid',
  },
];

const COMPANIES = [
  {
    name: 'Brain Station 23',
    email: 'hr@brainstation23.test',
    website: 'https://brainstation-23.com',
    industry: 'Software Development',
    location: 'Dhaka',
    employees: 900,
    foundedYear: 2006,
    about:
      'Brain Station 23 is one of the largest software companies in Bangladesh, delivering enterprise products for clients across 20+ countries.',
  },
  {
    name: 'BJIT',
    email: 'hr@bjit.test',
    website: 'https://bjitgroup.com',
    industry: 'IT Services',
    location: 'Dhaka',
    employees: 1200,
    foundedYear: 2001,
    about:
      'BJIT partners with Japanese and global enterprises on software engineering, AI and digital transformation projects.',
  },
  {
    name: 'Shajgoj',
    email: 'hr@shajgoj.test',
    website: 'https://shajgoj.com',
    industry: 'E-commerce',
    location: 'Dhaka',
    employees: 250,
    foundedYear: 2017,
    about:
      'Shajgoj is the leading beauty and personal-care commerce platform in Bangladesh with its own content and logistics network.',
  },
  {
    name: 'Pathao',
    email: 'hr@pathao.test',
    website: 'https://pathao.com',
    industry: 'Transportation',
    location: 'Dhaka',
    employees: 800,
    foundedYear: 2015,
    about:
      'Pathao powers ride-sharing, food delivery and logistics across Bangladesh, moving millions of people and parcels every month.',
  },
  {
    name: 'Shohoz',
    email: 'hr@shohoz.test',
    website: 'https://shohoz.com',
    industry: 'Travel Tech',
    location: 'Dhaka',
    employees: 400,
    foundedYear: 2014,
    about:
      "Shohoz is the country's largest online ticket and travel platform, serving bus, launch, train and event ticketing.",
  },
];

/**
 * Spec distribution: how many jobs each company posts and how many
 * applications it receives (30 jobs / 200 applications in total).
 */
const COMPANY_VOLUME: Record<string, { jobs: number; applications: number }> = {
  'Brain Station 23': { jobs: 12, applications: 87 },
  BJIT: { jobs: 8, applications: 45 },
  Shajgoj: { jobs: 4, applications: 28 },
  Pathao: { jobs: 3, applications: 22 },
  Shohoz: { jobs: 3, applications: 18 },
};

/** Weighted status mix: applied 25% · reviewed 18% · shortlisted 15% · interviewed 12% · hired 6% · rejected 24%. */
const STATUS_WEIGHTS: Array<{ status: string; weight: number }> = [
  { status: 'APPLIED', weight: 0.25 },
  { status: 'REVIEWED', weight: 0.18 },
  { status: 'SHORTLISTED', weight: 0.15 },
  { status: 'INTERVIEWED', weight: 0.12 },
  { status: 'HIRED', weight: 0.06 },
  { status: 'REJECTED', weight: 0.24 },
];

/** Interleaved status queue of exactly `count` entries. */
function buildStatusQueue(count: number): string[] {
  const plan = STATUS_WEIGHTS.map((entry) => ({
    status: entry.status,
    remaining: Math.floor(count * entry.weight),
  }));

  let assigned = plan.reduce((sum, entry) => sum + entry.remaining, 0);
  for (const entry of plan) {
    if (assigned >= count) break;
    entry.remaining += 1;
    assigned += 1;
  }

  const queue: string[] = [];
  let cursor = 0;
  while (queue.length < count) {
    const entry = plan[cursor % plan.length];
    if (entry.remaining > 0) {
      queue.push(entry.status);
      entry.remaining -= 1;
    }
    cursor += 1;
  }
  return queue;
}

const STUDENTS = [
  { name: 'Rahim Uddin', department: 'CSE', cgpa: 3.75, skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'] },
  { name: 'Karim Hasan', department: 'CSE', cgpa: 3.4, skills: ['Python', 'Django', 'PostgreSQL', 'REST API'] },
  { name: 'Nusrat Jahan', department: 'CSE', cgpa: 3.9, skills: ['Flutter', 'Dart', 'Firebase', 'REST API'] },
  { name: 'Tanvir Ahmed', department: 'EEE', cgpa: 3.3, skills: ['Docker', 'Kubernetes', 'AWS', 'CI/CD'] },
  { name: 'Sadia Islam', department: 'BBA', cgpa: 3.6, skills: ['Figma', 'User Research', 'Prototyping', 'Excel'] },
  { name: 'Rifat Chowdhury', department: 'CSE', cgpa: 3.2, skills: ['React', 'Redux', 'Tailwind CSS', 'JavaScript'] },
  { name: 'Mim Akter', department: 'CSE', cgpa: 3.55, skills: ['Python', 'Pandas', 'SQL', 'Excel'] },
  { name: 'Shakib Al Hasan', department: 'CSE', cgpa: 3.05, skills: ['Node.js', 'Express', 'Prisma', 'MySQL'] },
  { name: 'Farhana Yasmin', department: 'ARCH', cgpa: 3.45, skills: ['Figma', 'Wireframing', 'Adobe XD'] },
  { name: 'Imran Kabir', department: 'CSE', cgpa: 3.85, skills: ['React', 'Next.js', 'TypeScript', 'Tailwind CSS'] },
  { name: 'Sumaiya Noor', department: 'CSE', cgpa: 3.15, skills: ['Flutter', 'Dart', 'Kotlin'] },
  { name: 'Jahid Hossain', department: 'EEE', cgpa: 3.0, skills: ['Docker', 'Linux', 'AWS', 'Bash'] },
  { name: 'Lamia Sultana', department: 'BBA', cgpa: 3.7, skills: ['SQL', 'Excel', 'Power BI', 'Python'] },
  { name: 'Arif Mahmud', department: 'CSE', cgpa: 3.35, skills: ['Java', 'Spring Boot', 'PostgreSQL'] },
  { name: 'Puja Dey', department: 'CSE', cgpa: 3.62, skills: ['React', 'JavaScript', 'CSS', 'Figma'] },
  { name: 'Sabbir Rahman', department: 'CIVIL', cgpa: 2.9, skills: ['AutoCAD', 'Project Management', 'Excel'] },
];

/** Applications per status — superseded by the per-company weighted mix below. */

const COVER_LETTERS = [
  'I am a final-year CSE student at NUB with hands-on experience building production web apps. I would love to contribute to your team.',
  'Your engineering culture and product scale really appeal to me. I have shipped similar features in my university projects and internships.',
  'I have been following your company for a while and this role matches my skills and career goals closely.',
  '',
  '',
];

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

async function main(): Promise<void> {
  console.log('Seeding employer + application demo data…');
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // ── Students ──────────────────────────────────────────────────────────────
  const students: Array<{ id: string; skills: string[]; cgpa: number; userId: string; name: string }> = [];

  for (const [index, student] of STUDENTS.entries()) {
    const email = `seed.student${index + 1}@nubjobs.test`;
    const user = await prisma.user.upsert({
      where: { email },
      update: { name: student.name },
      create: {
        email,
        name: student.name,
        password: passwordHash,
        role: 'STUDENT',
        isEmailVerified: true,
      },
    });

    const profileData = {
      department: student.department,
      cgpa: student.cgpa,
      skills: student.skills,
      resumeUrl: RESUME_URL,
      location: 'Dhaka',
      bio: `${student.name} is a ${student.department} student at NUB focused on ${student.skills
        .slice(0, 2)
        .join(' & ')}.`,
    };

    const profile = await prisma.studentProfile.upsert({
      where: { userId: user.id },
      update: profileData,
      create: { userId: user.id, ...profileData },
    });

    students.push({
      id: profile.id,
      skills: student.skills,
      cgpa: student.cgpa,
      userId: user.id,
      name: student.name,
    });
  }
  console.log(`✓ students: ${students.length}`);

  // ── Employers + jobs ──────────────────────────────────────────────────────
  const jobs: Array<{
    id: string;
    title: string;
    skills: string[];
    minCgpa: number;
    employerUserId: string;
    companyName: string;
  }> = [];

  for (const company of COMPANIES) {
    const user = await prisma.user.upsert({
      where: { email: company.email },
      update: { name: company.name },
      create: {
        email: company.email,
        name: company.name,
        password: passwordHash,
        role: 'EMPLOYER',
        isEmailVerified: true,
      },
    });

    const profileData = {
      companyName: company.name,
      about: company.about,
      website: company.website,
      industry: company.industry,
      location: company.location,
      employees: company.employees,
      foundedYear: company.foundedYear,
      isVerified: true,
      verifiedAt: daysAgo(30),
      email: company.email,
      phone: '+8809600000000',
    };

    const employer = await prisma.employerProfile.upsert({
      where: { userId: user.id },
      update: profileData,
      create: { userId: user.id, ...profileData },
    });

    const volume = COMPANY_VOLUME[company.name] ?? {
      jobs: JOB_TEMPLATES.length,
      applications: 0,
    };

    // Re-runnable: drop any postings left over from an earlier seed run so the
    // job count matches COMPANY_VOLUME exactly. Applications, messages and
    // saved jobs cascade with the job.
    await prisma.job.deleteMany({ where: { employerId: employer.id } });

    for (let index = 0; index < volume.jobs; index += 1) {
      const base = JOB_TEMPLATES[index % JOB_TEMPLATES.length];
      const level = Math.floor(index / JOB_TEMPLATES.length);
      const template = {
        ...base,
        title:
          level === 0
            ? base.title
            : `${base.title} — ${['Mid-level', 'Senior', 'Lead'][level - 1] ?? `Level ${level + 1}`}`,
      };

      const description = `${company.name} is hiring a ${template.title}.

Responsibilities
• Build and ship features with ${template.skills.slice(0, 2).join(' and ')}
• Collaborate with product, design and QA
• Write maintainable, well-tested code

Requirements
• CGPA ${template.minCgpa}+ (NUB students preferred)
• Hands-on experience with ${template.skills.join(', ')}`;

      const jobData = {
        employerId: employer.id,
        title: template.title,
        description,
        category: template.category,
        type: template.type,
        location: template.location,
        salaryMin: template.salaryMin,
        salaryMax: template.salaryMax,
        minCgpa: template.minCgpa,
        skills: template.skills,
        targetUniversity: index % 3 === 0 ? 'NUB' : 'ALL',
        deadline: daysAgo(-30 + index * 5),
        status: 'ACTIVE' as const,
        views: 40 + index * 17,
        createdAt: daysAgo(70 - index * 8),
      };

      const existing = await prisma.job.findFirst({
        where: { employerId: employer.id, title: template.title },
      });

      const job = existing
        ? await prisma.job.update({ where: { id: existing.id }, data: jobData })
        : await prisma.job.create({ data: jobData });

      jobs.push({
        id: job.id,
        title: job.title,
        skills: job.skills,
        minCgpa: job.minCgpa ?? 0,
        employerUserId: user.id,
        companyName: company.name,
      });
    }
  }
  console.log(`✓ employers: ${COMPANIES.length}, jobs: ${jobs.length}`);

  // ── Applications (exact per-company distribution) ─────────────────────────
  const jobIds = jobs.map((job) => job.id);

  // Re-runnable: drop the applications previously created for these demo jobs.
  await prisma.application.deleteMany({ where: { jobId: { in: jobIds } } });

  // Each company only receives applications for ITS OWN jobs, so an employer
  // logging in sees exactly the spec numbers (87/45/28/22/18).
  const selected: Array<{ job: (typeof jobs)[number]; student: (typeof students)[number] }> = [];
  const seenPairs = new Set<string>();

  for (const company of COMPANIES) {
    const wanted = COMPANY_VOLUME[company.name]?.applications ?? 0;
    const companyPairs = jobs
      .filter((job) => job.companyName === company.name)
      .flatMap((job) => students.map((student) => ({ job, student })));

    let taken = 0;
    // Round-robin across the company's jobs so EVERY posting receives
    // applicants (87 apps → ~7 per job at Brain Station 23), instead of
    // filling the first jobs and leaving the rest at zero.
    const byJob = new Map<string, Array<{ job: (typeof jobs)[number]; student: (typeof students)[number] }>>();
    for (const pair of companyPairs) {
      const list = byJob.get(pair.job.id) ?? [];
      list.push(pair);
      byJob.set(pair.job.id, list);
    }

    let round = 0;
    while (taken < wanted) {
      let progressed = false;
      for (const list of byJob.values()) {
        if (taken >= wanted) break;
        const pair = list[round];
        if (!pair) continue;
        const key = `${pair.job.id}:${pair.student.id}`;
        if (seenPairs.has(key)) continue;
        seenPairs.add(key);
        selected.push(pair);
        taken += 1;
        progressed = true;
      }
      if (!progressed) break;
      round += 1;
    }
  }

  // One proportional status queue per company.
  const statusQueues = new Map<string, string[]>();
  const statusCursors = new Map<string, number>();
  for (const company of COMPANIES) {
    statusQueues.set(
      company.name,
      buildStatusQueue(COMPANY_VOLUME[company.name]?.applications ?? 0)
    );
    statusCursors.set(company.name, 0);
  }

  const created: Array<{
    id: string;
    status: string;
    studentUserId: string;
    employerUserId: string;
    appliedAt: Date;
  }> = [];

  for (const [index, pair] of selected.entries()) {
    // Per-company status (interleaved so each pipeline column stays mixed).
    const companyQueue = statusQueues.get(pair.job.companyName) ?? [];
    const companyCursor = statusCursors.get(pair.job.companyName) ?? 0;
    const status = companyQueue[companyCursor] ?? 'APPLIED';
    statusCursors.set(pair.job.companyName, companyCursor + 1);
    const appliedAt = daysAgo(75 - (index % 70));
    const progressed = status !== 'APPLIED';
    const reviewedAt = progressed ? daysAgo(Math.max(1, 70 - (index % 70))) : null;
    const interviewDate =
      status === 'INTERVIEWED' ? daysAgo(Math.max(1, 20 - (index % 20))) : null;
    const updatedAt = progressed ? daysAgo(Math.max(1, 65 - (index % 65))) : appliedAt;

    const matchScore = calculateMatchScore(
      { skills: pair.student.skills, cgpa: pair.student.cgpa },
      { skills: pair.job.skills, minCgpa: pair.job.minCgpa }
    );

    const application = await prisma.application.create({
      data: {
        jobId: pair.job.id,
        studentId: pair.student.id,
        coverLetter: COVER_LETTERS[index % COVER_LETTERS.length] || null,
        resumeUrl: RESUME_URL,
        matchScore,
        status: status as 'APPLIED',
        notes: ['SHORTLISTED', 'INTERVIEWED', 'HIRED', 'REJECTED'].includes(status)
          ? 'Screening call completed — feedback shared with the hiring manager.'
          : null,
        createdAt: appliedAt,
        updatedAt,
        reviewedAt,
        interviewDate,
      },
    });

    created.push({
      id: application.id,
      status,
      studentUserId: pair.student.userId,
      employerUserId: pair.job.employerUserId,
      appliedAt,
    });
  }

  // ── Message threads (chat + "last message" column) ────────────────────────
  const chatty = created.filter((entry) => entry.status !== 'APPLIED').slice(0, 12);

  for (const [index, entry] of chatty.entries()) {
    const first = new Date(entry.appliedAt.getTime() + 2 * 24 * 60 * 60 * 1000);
    const second = new Date(first.getTime() + 6 * 60 * 60 * 1000);

    await prisma.message.createMany({
      data: [
        {
          applicationId: entry.id,
          senderId: entry.studentUserId,
          content:
            'Thank you for reviewing my application. I am available for an interview any day this week.',
          isRead: true,
          createdAt: first,
          updatedAt: first,
        },
        {
          applicationId: entry.id,
          senderId: entry.employerUserId,
          content:
            index % 2 === 0
              ? 'Thanks for applying! Could you share a suitable time for a 30-minute call?'
              : 'Great profile. Are you comfortable working from our Dhaka office twice a week?',
          isRead: false,
          createdAt: second,
          updatedAt: second,
        },
      ],
    });
  }
  console.log(`✓ message threads: ${chatty.length}`);

  // ── Keep Job.applicantCount in sync with the seeded rows ──────────────────
  const counts = await prisma.application.groupBy({
    by: ['jobId'],
    where: { jobId: { in: jobIds } },
    _count: { _all: true },
  });

  for (const row of counts) {
    await prisma.job.update({
      where: { id: row.jobId },
      data: { applicantCount: row._count._all },
    });
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  const breakdown = await prisma.application.groupBy({
    by: ['status'],
    where: { jobId: { in: jobIds } },
    _count: { _all: true },
  });

  console.log(`✓ applications: ${created.length}`);
  console.log(
    '  ' + breakdown.map((row) => `${row.status}=${row._count._all}`).join(' · ')
  );
  console.log(`✓ jobs updated (applicantCount): ${counts.length}`);
  console.log('');
  console.log('Demo logins (password: ' + PASSWORD + ')');
  console.log('  student : seed.student1@nubjobs.test');
  console.log('  employer: hr@brainstation23.test');
  console.log('  admin   : admin@nubjobs.local');
}

void main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });

