/**
 * Non-destructive demo data script.
 *
 * Unlike `seed.ts` (which wipes every table), this only ADDS what is missing:
 *   1. an ADMIN account so the admin panel can be used,
 *   2. at least one company (employer profile) to own the job posts,
 *   3. a set of ACTIVE demo jobs across all categories, but only when the
 *      jobs table is empty (pass --force to add them anyway).
 *
 * Usage:
 *   npm run prisma:seed:demo
 *   npm run prisma:seed:demo -- --force
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@nubjobs.local';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Password123!';

type DemoJob = {
  title: string;
  category: string;
  type: 'FULL_TIME' | 'PART_TIME' | 'INTERNSHIP' | 'CONTRACT' | 'REMOTE' | 'HYBRID';
  location: string;
  salaryMin: number;
  salaryMax: number;
  minCgpa: number;
  skills: string[];
  targetUniversity: 'ALL' | 'NUB';
};

const DEMO_JOBS: DemoJob[] = [
  {
    title: 'Junior Software Engineer',
    category: 'Software Engineering',
    type: 'FULL_TIME',
    location: 'Dhaka',
    salaryMin: 30000,
    salaryMax: 45000,
    minCgpa: 3.0,
    skills: ['JavaScript', 'React', 'Node.js', 'Git'],
    targetUniversity: 'NUB',
  },
  {
    title: 'Frontend Developer Intern',
    category: 'Software Engineering',
    type: 'INTERNSHIP',
    location: 'Dhaka',
    salaryMin: 12000,
    salaryMax: 18000,
    minCgpa: 2.75,
    skills: ['HTML', 'CSS', 'React', 'TypeScript'],
    targetUniversity: 'NUB',
  },
  {
    title: 'Backend Engineer (Remote)',
    category: 'Software Engineering',
    type: 'REMOTE',
    location: 'Remote',
    salaryMin: 50000,
    salaryMax: 70000,
    minCgpa: 3.2,
    skills: ['Node.js', 'PostgreSQL', 'Docker', 'REST API'],
    targetUniversity: 'ALL',
  },
  {
    title: 'Digital Marketing Executive',
    category: 'Marketing',
    type: 'FULL_TIME',
    location: 'Dhaka',
    salaryMin: 25000,
    salaryMax: 35000,
    minCgpa: 2.75,
    skills: ['SEO', 'Meta Ads', 'Content Writing', 'Analytics'],
    targetUniversity: 'NUB',
  },
  {
    title: 'Social Media Manager (Hybrid)',
    category: 'Marketing',
    type: 'HYBRID',
    location: 'Chattogram',
    salaryMin: 22000,
    salaryMax: 30000,
    minCgpa: 2.5,
    skills: ['Community Management', 'Canva', 'Copywriting'],
    targetUniversity: 'ALL',
  },
  {
    title: 'Accounts & Finance Officer',
    category: 'Finance',
    type: 'FULL_TIME',
    location: 'Dhaka',
    salaryMin: 28000,
    salaryMax: 40000,
    minCgpa: 3.0,
    skills: ['Excel', 'Tally', 'Financial Reporting'],
    targetUniversity: 'NUB',
  },
  {
    title: 'Finance Intern',
    category: 'Finance',
    type: 'INTERNSHIP',
    location: 'Dhaka',
    salaryMin: 10000,
    salaryMax: 14000,
    minCgpa: 2.75,
    skills: ['Excel', 'Accounting Basics'],
    targetUniversity: 'NUB',
  },
  {
    title: 'UI/UX Designer',
    category: 'Design',
    type: 'FULL_TIME',
    location: 'Dhaka',
    salaryMin: 32000,
    salaryMax: 48000,
    minCgpa: 2.8,
    skills: ['Figma', 'Wireframing', 'User Research'],
    targetUniversity: 'NUB',
  },
  {
    title: 'Graphic Designer (Part Time)',
    category: 'Design',
    type: 'PART_TIME',
    location: 'Remote',
    salaryMin: 15000,
    salaryMax: 22000,
    minCgpa: 2.5,
    skills: ['Illustrator', 'Photoshop', 'Branding'],
    targetUniversity: 'ALL',
  },
  {
    title: 'Junior Data Analyst',
    category: 'Data Science',
    type: 'FULL_TIME',
    location: 'Dhaka',
    salaryMin: 35000,
    salaryMax: 50000,
    minCgpa: 3.2,
    skills: ['Python', 'SQL', 'Power BI', 'Statistics'],
    targetUniversity: 'NUB',
  },
  {
    title: 'Machine Learning Intern',
    category: 'Data Science',
    type: 'INTERNSHIP',
    location: 'Dhaka',
    salaryMin: 15000,
    salaryMax: 20000,
    minCgpa: 3.4,
    skills: ['Python', 'Scikit-learn', 'Pandas'],
    targetUniversity: 'NUB',
  },
  {
    title: 'Business Development Executive',
    category: 'Business Development',
    type: 'FULL_TIME',
    location: 'Dhaka',
    salaryMin: 26000,
    salaryMax: 38000,
    minCgpa: 2.75,
    skills: ['Negotiation', 'CRM', 'Communication'],
    targetUniversity: 'NUB',
  },
  {
    title: 'HR & Admin Officer',
    category: 'Human Resources',
    type: 'FULL_TIME',
    location: 'Chattogram',
    salaryMin: 24000,
    salaryMax: 33000,
    minCgpa: 2.75,
    skills: ['Recruitment', 'MS Office', 'Payroll'],
    targetUniversity: 'NUB',
  },
  {
    title: 'Operations Associate',
    category: 'Operations',
    type: 'CONTRACT',
    location: 'Dhaka',
    salaryMin: 22000,
    salaryMax: 30000,
    minCgpa: 2.5,
    skills: ['Logistics', 'Excel', 'Coordination'],
    targetUniversity: 'ALL',
  },
];
const buildDescription = (job: DemoJob) =>
  [
    `${job.title} at NUBJobs Demo Company.`,
    '',
    `We are looking for a motivated candidate to join our ${job.category} team.`,
    `You will work with ${job.skills.slice(0, 3).join(', ')} and grow with a supportive team.`,
    'Fresh graduates from Northern University Bangladesh are encouraged to apply.',
  ].join('\n');

async function main() {
  const force = process.argv.includes('--force');
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  // 1. Admin account (required to use /admin and post jobs from the panel).
  const existingAdmin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        name: 'System Admin',
        password: passwordHash,
        role: 'ADMIN',
        isEmailVerified: true,
      },
    });
    console.log(`[ok] Created admin ${ADMIN_EMAIL} (password: ${ADMIN_PASSWORD})`);
  } else if (existingAdmin.role !== 'ADMIN') {
    await prisma.user.update({ where: { id: existingAdmin.id }, data: { role: 'ADMIN' } });
    console.log(`[ok] Promoted existing user ${ADMIN_EMAIL} to ADMIN`);
  } else {
    console.log(`[-] Admin ${ADMIN_EMAIL} already exists`);
  }

  // 2. A company to own the demo jobs (re-uses any existing employer profile).
  let employer = await prisma.employerProfile.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!employer) {
    const employerUser = await prisma.user.create({
      data: {
        email: 'hr@nubjobs.local',
        name: 'NUBJobs Demo Company',
        password: passwordHash,
        role: 'EMPLOYER',
        isEmailVerified: true,
        employerProfile: {
          create: {
            companyName: 'NUBJobs Demo Company',
            about: 'A demo company created so sample job posts have an owner.',
            isVerified: true,
          },
        },
      },
      include: { employerProfile: true },
    });
    employer = employerUser.employerProfile!;
    console.log('[ok] Created demo company (hr@nubjobs.local)');
  } else {
    console.log(`[-] Using company ${employer.companyName}`);
  }

  // 3. Demo jobs - only added when there are none (unless --force).
  const jobCount = await prisma.job.count();
  if (jobCount > 0 && !force) {
    console.log(`[-] Skipped demo jobs: ${jobCount} job(s) already exist (use --force to add more)`);
    return;
  }

  for (const job of DEMO_JOBS) {
    await prisma.job.create({
      data: {
        employerId: employer.id,
        title: job.title,
        description: buildDescription(job),
        category: job.category,
        type: job.type,
        location: job.location,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        minCgpa: job.minCgpa,
        skills: job.skills,
        targetUniversity: job.targetUniversity,
        status: 'ACTIVE',
        publishedAt: new Date(),
      },
    });
  }

  console.log(`[ok] Created ${DEMO_JOBS.length} active demo jobs across all categories`);
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });