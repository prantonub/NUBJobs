/**
 * Full discovery/applications demo dataset (non-destructive).
 *
 * Creates (never deletes) the complete testing scenario for the job discovery
 * and application system:
 *   1. an ADMIN account,
 *   2. 5 verified employer companies,
 *   3. 15 students with varied CGPAs/skills,
 *   4. 30 jobs (22 ACTIVE, 8 PENDING awaiting admin approval),
 *   5. 80 applications across every pipeline status.
 *
 * Usage:
 *   npm run prisma:seed:full
 *   npm run prisma:seed:full -- --force   (add jobs/applications even if some exist)
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@nubjobs.local';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Password123!';
const ACCOUNT_PASSWORD = 'Password123!';

type JobType = 'FULL_TIME' | 'PART_TIME' | 'INTERNSHIP' | 'CONTRACT' | 'REMOTE' | 'HYBRID';

type SeedJob = {
  title: string;
  category: string;
  type: JobType;
  location: string;
  salaryMin: number;
  salaryMax: number;
  minCgpa: number;
  skills: string[];
  targetUniversity: 'ALL' | 'NUB';
  status: 'ACTIVE' | 'PENDING';
};

type SeedStudent = { email: string; name: string; cgpa: number; skills: string[] };

const COMPANIES = [
  { email: 'hr@brainstation23.test', name: 'Brain Station 23', about: 'One of Bangladesh leading software companies, building products for global clients.', website: 'https://www.brainstation-23.com' },
  { email: 'hr@gigatechltd.test', name: 'GigaTech Ltd', about: 'Fintech startup modernising payments for Bangladeshi banks.', website: 'https://gigatech.example.com' },
  { email: 'hr@nubmedia.test', name: 'NUB Media House', about: 'Digital marketing and media agency working with national brands.', website: 'https://nubmedia.example.com' },
  { email: 'hr@dhakafinance.test', name: 'Dhaka Finance & Consulting', about: 'Accounting, audit and advisory services for SMEs.', website: 'https://dhakafinance.example.com' },
  { email: 'hr@creativedb.test', name: 'CreativeDB Studio', about: 'Design studio specialising in brand systems and product UX.', website: 'https://creativedb.example.com' },
];

const STUDENTS: SeedStudent[] = [
  { email: 'student.rahim@gmail.test', name: 'Rahim Uddin', cgpa: 3.75, skills: ['JavaScript', 'React', 'Node.js', 'Git', 'TypeScript'] },
  { email: 'student.karim@gmail.test', name: 'Karim Ahmed', cgpa: 3.4, skills: ['Python', 'Django', 'PostgreSQL', 'REST API'] },
  { email: 'student.nusrat@gmail.test', name: 'Nusrat Jahan', cgpa: 3.9, skills: ['Figma', 'UI Design', 'User Research', 'Wireframing'] },
  { email: 'student.tanvir@gmail.test', name: 'Tanvir Hasan', cgpa: 3.1, skills: ['JavaScript', 'HTML', 'CSS', 'React'] },
  { email: 'student.sadia@gmail.test', name: 'Sadia Islam', cgpa: 3.55, skills: ['SEO', 'Content Writing', 'Meta Ads', 'Analytics'] },
  { email: 'student.rifat@gmail.test', name: 'Rifat Chowdhury', cgpa: 2.9, skills: ['Excel', 'Accounting Basics', 'Tally'] },
  { email: 'student.mim@gmail.test', name: 'Mim Akter', cgpa: 3.25, skills: ['TypeScript', 'React', 'Next.js', 'Tailwind CSS'] },
  { email: 'student.shakib@gmail.test', name: 'Shakib Al Hasan', cgpa: 3.6, skills: ['Node.js', 'Express', 'MongoDB', 'Docker'] },
  { email: 'student.farhana@gmail.test', name: 'Farhana Rahman', cgpa: 3.05, skills: ['Copywriting', 'Canva', 'Community Management'] },
  { email: 'student.imran@gmail.test', name: 'Imran Khan', cgpa: 3.8, skills: ['Java', 'Spring Boot', 'PostgreSQL', 'REST API'] },
  { email: 'student.jannat@gmail.test', name: 'Jannatul Ferdous', cgpa: 2.7, skills: ['HTML', 'CSS', 'JavaScript'] },
  { email: 'student.arif@gmail.test', name: 'Arif Mahmud', cgpa: 3.35, skills: ['Financial Reporting', 'Excel', 'Audit'] },
  { email: 'student.lubna@gmail.test', name: 'Lubna Haque', cgpa: 3.7, skills: ['Figma', 'Prototyping', 'Design Systems'] },
  { email: 'student.hasib@gmail.test', name: 'Hasibul Karim', cgpa: 3.0, skills: ['Python', 'Data Analysis', 'Pandas'] },
  { email: 'student.tahsin@gmail.test', name: 'Tahsin Rahman', cgpa: 3.45, skills: ['Flutter', 'Dart', 'Firebase'] },
];

const JOBS: SeedJob[] = [
  // 22 ACTIVE
  { title: 'Junior Software Engineer', category: 'Software Engineering', type: 'FULL_TIME', location: 'Dhaka', salaryMin: 30000, salaryMax: 45000, minCgpa: 3.0, skills: ['JavaScript', 'React', 'Node.js', 'Git'], targetUniversity: 'NUB', status: 'ACTIVE' },
  { title: 'Frontend Developer Intern', category: 'Software Engineering', type: 'INTERNSHIP', location: 'Dhaka', salaryMin: 12000, salaryMax: 18000, minCgpa: 2.75, skills: ['HTML', 'CSS', 'React', 'TypeScript'], targetUniversity: 'NUB', status: 'ACTIVE' },
  { title: 'Backend Engineer (Remote)', category: 'Software Engineering', type: 'REMOTE', location: 'Remote', salaryMin: 50000, salaryMax: 70000, minCgpa: 3.2, skills: ['Node.js', 'PostgreSQL', 'Docker', 'REST API'], targetUniversity: 'ALL', status: 'ACTIVE' },
  { title: 'Full Stack Developer', category: 'Software Engineering', type: 'FULL_TIME', location: 'Dhaka', salaryMin: 45000, salaryMax: 65000, minCgpa: 3.1, skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL'], targetUniversity: 'ALL', status: 'ACTIVE' },
  { title: 'QA Engineer', category: 'Software Engineering', type: 'FULL_TIME', location: 'Dhaka', salaryMin: 28000, salaryMax: 40000, minCgpa: 2.8, skills: ['Testing', 'Selenium', 'Agile'], targetUniversity: 'ALL', status: 'ACTIVE' },
  { title: 'DevOps Intern', category: 'Software Engineering', type: 'INTERNSHIP', location: 'Dhaka', salaryMin: 15000, salaryMax: 20000, minCgpa: 3.0, skills: ['Docker', 'Linux', 'CI/CD'], targetUniversity: 'NUB', status: 'ACTIVE' },
  { title: 'Mobile App Developer (Flutter)', category: 'Software Engineering', type: 'FULL_TIME', location: 'Chattogram', salaryMin: 38000, salaryMax: 55000, minCgpa: 3.0, skills: ['Flutter', 'Dart', 'Firebase'], targetUniversity: 'ALL', status: 'ACTIVE' },
  { title: 'Python Data Analyst', category: 'Data & Analytics', type: 'FULL_TIME', location: 'Dhaka', salaryMin: 35000, salaryMax: 50000, minCgpa: 3.2, skills: ['Python', 'Data Analysis', 'Pandas'], targetUniversity: 'ALL', status: 'ACTIVE' },
  { title: 'BI Intern', category: 'Data & Analytics', type: 'INTERNSHIP', location: 'Dhaka', salaryMin: 12000, salaryMax: 16000, minCgpa: 2.9, skills: ['Excel', 'SQL', 'Data Analysis'], targetUniversity: 'NUB', status: 'ACTIVE' },
  { title: 'Digital Marketing Executive', category: 'Marketing', type: 'FULL_TIME', location: 'Dhaka', salaryMin: 25000, salaryMax: 35000, minCgpa: 2.75, skills: ['SEO', 'Meta Ads', 'Content Writing', 'Analytics'], targetUniversity: 'NUB', status: 'ACTIVE' },
  { title: 'Social Media Manager (Hybrid)', category: 'Marketing', type: 'HYBRID', location: 'Chattogram', salaryMin: 22000, salaryMax: 30000, minCgpa: 2.5, skills: ['Community Management', 'Canva', 'Copywriting'], targetUniversity: 'ALL', status: 'ACTIVE' },
  { title: 'SEO Specialist', category: 'Marketing', type: 'FULL_TIME', location: 'Remote', salaryMin: 24000, salaryMax: 34000, minCgpa: 2.75, skills: ['SEO', 'Google Analytics', 'Content Writing'], targetUniversity: 'ALL', status: 'ACTIVE' },
  { title: 'Content Writer (Part-time)', category: 'Marketing', type: 'PART_TIME', location: 'Remote', salaryMin: 10000, salaryMax: 15000, minCgpa: 2.5, skills: ['Content Writing', 'Copywriting'], targetUniversity: 'ALL', status: 'ACTIVE' },
  { title: 'Accounts & Finance Officer', category: 'Finance', type: 'FULL_TIME', location: 'Dhaka', salaryMin: 28000, salaryMax: 40000, minCgpa: 3.0, skills: ['Excel', 'Tally', 'Financial Reporting'], targetUniversity: 'NUB', status: 'ACTIVE' },
  { title: 'Finance Intern', category: 'Finance', type: 'INTERNSHIP', location: 'Dhaka', salaryMin: 10000, salaryMax: 14000, minCgpa: 2.75, skills: ['Excel', 'Accounting Basics'], targetUniversity: 'NUB', status: 'ACTIVE' },
  { title: 'Junior Auditor', category: 'Finance', type: 'FULL_TIME', location: 'Dhaka', salaryMin: 30000, salaryMax: 42000, minCgpa: 3.2, skills: ['Audit', 'Financial Reporting', 'Excel'], targetUniversity: 'ALL', status: 'ACTIVE' },
  { title: 'UI/UX Designer', category: 'Design', type: 'FULL_TIME', location: 'Dhaka', salaryMin: 32000, salaryMax: 48000, minCgpa: 2.8, skills: ['Figma', 'Wireframing', 'User Research'], targetUniversity: 'NUB', status: 'ACTIVE' },
  { title: 'Design Intern', category: 'Design', type: 'INTERNSHIP', location: 'Dhaka', salaryMin: 10000, salaryMax: 15000, minCgpa: 2.5, skills: ['Canva', 'Figma', 'UI Design'], targetUniversity: 'ALL', status: 'ACTIVE' },
  { title: 'Brand Designer', category: 'Design', type: 'CONTRACT', location: 'Remote', salaryMin: 30000, salaryMax: 45000, minCgpa: 2.8, skills: ['UI Design', 'Design Systems', 'Prototyping'], targetUniversity: 'ALL', status: 'ACTIVE' },
  { title: 'HR & Admin Officer', category: 'Human Resources', type: 'FULL_TIME', location: 'Dhaka', salaryMin: 25000, salaryMax: 35000, minCgpa: 2.75, skills: ['Recruitment', 'Communication', 'Excel'], targetUniversity: 'ALL', status: 'ACTIVE' },
  { title: 'Operations Executive', category: 'Operations', type: 'FULL_TIME', location: 'Chattogram', salaryMin: 22000, salaryMax: 30000, minCgpa: 2.5, skills: ['Logistics', 'Excel', 'Coordination'], targetUniversity: 'ALL', status: 'ACTIVE' },
  { title: 'Customer Support (Night Shift)', category: 'Operations', type: 'PART_TIME', location: 'Dhaka', salaryMin: 12000, salaryMax: 18000, minCgpa: 2.5, skills: ['Communication', 'English'], targetUniversity: 'ALL', status: 'ACTIVE' },
  // 8 PENDING (awaiting admin approval)
  { title: 'Machine Learning Engineer', category: 'Data & Analytics', type: 'FULL_TIME', location: 'Dhaka', salaryMin: 55000, salaryMax: 80000, minCgpa: 3.4, skills: ['Python', 'Machine Learning', 'TensorFlow'], targetUniversity: 'ALL', status: 'PENDING' },
  { title: 'Site Reliability Engineer', category: 'Software Engineering', type: 'FULL_TIME', location: 'Remote', salaryMin: 60000, salaryMax: 85000, minCgpa: 3.3, skills: ['Kubernetes', 'AWS', 'Docker'], targetUniversity: 'ALL', status: 'PENDING' },
  { title: 'Growth Marketing Intern', category: 'Marketing', type: 'INTERNSHIP', location: 'Dhaka', salaryMin: 12000, salaryMax: 16000, minCgpa: 2.8, skills: ['Meta Ads', 'Analytics', 'SEO'], targetUniversity: 'NUB', status: 'PENDING' },
  { title: 'Treasury Analyst', category: 'Finance', type: 'FULL_TIME', location: 'Dhaka', salaryMin: 40000, salaryMax: 55000, minCgpa: 3.3, skills: ['Financial Reporting', 'Excel', 'Audit'], targetUniversity: 'ALL', status: 'PENDING' },
  { title: 'Motion Graphics Designer', category: 'Design', type: 'CONTRACT', location: 'Remote', salaryMin: 25000, salaryMax: 40000, minCgpa: 2.6, skills: ['After Effects', 'UI Design'], targetUniversity: 'ALL', status: 'PENDING' },
  { title: 'Technical Recruiter', category: 'Human Resources', type: 'FULL_TIME', location: 'Dhaka', salaryMin: 30000, salaryMax: 42000, minCgpa: 2.9, skills: ['Recruitment', 'Communication'], targetUniversity: 'ALL', status: 'PENDING' },
  { title: 'Supply Chain Intern', category: 'Operations', type: 'INTERNSHIP', location: 'Chattogram', salaryMin: 10000, salaryMax: 14000, minCgpa: 2.7, skills: ['Logistics', 'Excel'], targetUniversity: 'NUB', status: 'PENDING' },
  { title: 'Campus Ambassador', category: 'Marketing', type: 'PART_TIME', location: 'Dhaka', salaryMin: 8000, salaryMax: 12000, minCgpa: 2.5, skills: ['Communication', 'Community Management'], targetUniversity: 'NUB', status: 'PENDING' },
];

const APPLICATION_STATUSES = ['APPLIED', 'REVIEWED', 'SHORTLISTED', 'INTERVIEWED', 'HIRED', 'REJECTED'] as const;

const buildDescription = (job: SeedJob, company: string) =>
  [
    job.title + ' at ' + company + '.',
    '',
    'We are looking for a motivated candidate to join our ' + job.category + ' team.',
    'You will work with ' + job.skills.slice(0, 3).join(', ') + ' and grow with a supportive team.',
    'Fresh graduates from Northern University Bangladesh are encouraged to apply.',
  ].join('\n');

async function main() {
  const force = process.argv.includes('--force');
  const passwordHash = await bcrypt.hash(ACCOUNT_PASSWORD, 10);

  // 1. Admin account
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
    console.log('[ok] Created admin ' + ADMIN_EMAIL + ' (password: ' + ADMIN_PASSWORD + ')');
  } else {
    console.log('[-] Admin ' + ADMIN_EMAIL + ' already exists');
  }

  // 2. Five verified companies
  const employers = [];
  for (const company of COMPANIES) {
    const existing = await prisma.user.findUnique({
      where: { email: company.email },
      include: { employerProfile: true },
    });
    if (existing?.employerProfile) {
      employers.push(existing.employerProfile);
      console.log('[-] Company ' + company.name + ' already exists');
      continue;
    }
    const created = await prisma.user.create({
      data: {
        email: company.email,
        name: company.name,
        password: passwordHash,
        role: 'EMPLOYER',
        isEmailVerified: true,
        employerProfile: {
          create: {
            companyName: company.name,
            about: company.about,
            website: company.website,
            isVerified: true,
          },
        },
      },
      include: { employerProfile: true },
    });
    employers.push(created.employerProfile!);
    console.log('[ok] Created company ' + company.name + ' (' + company.email + ')');
  }

  // 3. Fifteen students
  const students = [];
  for (const student of STUDENTS) {
    const existing = await prisma.user.findUnique({
      where: { email: student.email },
      include: { studentProfile: true },
    });
    if (existing?.studentProfile) {
      students.push(existing.studentProfile);
      console.log('[-] Student ' + student.name + ' already exists');
      continue;
    }
    const created = await prisma.user.create({
      data: {
        email: student.email,
        name: student.name,
        password: passwordHash,
        role: 'STUDENT',
        isEmailVerified: true,
        studentProfile: {
          create: {
            cgpa: student.cgpa,
            skills: student.skills,
            department: 'CSE',
            location: 'Dhaka',
          },
        },
      },
      include: { studentProfile: true },
    });
    students.push(created.studentProfile!);
    console.log('[ok] Created student ' + student.name + ' (CGPA ' + student.cgpa + ')');
  }

  // 4. Thirty jobs spread across the five companies (22 ACTIVE + 8 PENDING)
  const jobCountBefore = await prisma.job.count();
  if (jobCountBefore > 0 && !force) {
    console.log('[-] Skipped jobs/applications: ' + jobCountBefore + ' job(s) already exist (use --force)');
    return;
  }

  const createdJobs = [];
  for (let index = 0; index < JOBS.length; index += 1) {
    const job = JOBS[index];
    const company = employers[index % employers.length];
    createdJobs.push(
      await prisma.job.create({
        data: {
          employerId: company.id,
          title: job.title,
          description: buildDescription(job, company.companyName),
          category: job.category,
          type: job.type,
          location: job.location,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          minCgpa: job.minCgpa,
          skills: job.skills,
          targetUniversity: job.targetUniversity,
          status: job.status,
          publishedAt: job.status === 'ACTIVE' ? new Date(Date.now() - index * 86400000) : null,
          deadline: new Date(Date.now() + (60 - index) * 86400000),
          views: job.status === 'ACTIVE' ? Math.floor(Math.random() * 250) : 0,
          featured: index % 7 === 0,
        },
      })
    );
  }
  console.log('[ok] Created ' + createdJobs.length + ' jobs (22 ACTIVE, 8 PENDING)');

  // 5. Eighty applications across every status, several students per job
  const activeJobs = createdJobs.filter((job) => job.status === 'ACTIVE');
  const rotated = [...students].reverse();
  let created = 0;

  for (let index = 0; index < 80; index += 1) {
    const job = activeJobs[index % activeJobs.length];
    const student = rotated[index % students.length];

    // Respect the jobId+studentId unique constraint and the CGPA rule.
    if (job.minCgpa && (student.cgpa ?? 0) < job.minCgpa) continue;

    const duplicate = await prisma.application.findUnique({
      where: { jobId_studentId: { jobId: job.id, studentId: student.id } },
    });
    if (duplicate) continue;

    const status = APPLICATION_STATUSES[index % APPLICATION_STATUSES.length];
    await prisma.application.create({
      data: {
        jobId: job.id,
        studentId: student.id,
        status,
        coverLetter: 'I am excited to apply for ' + job.title + '. My skills match the requirements well.',
        matchScore: 40 + ((index * 7) % 60),
        createdAt: new Date(Date.now() - (index % 20) * 86400000),
        
      },
    });
    await prisma.job.update({
      where: { id: job.id },
      data: { applicantCount: { increment: 1 } },
    });
    created += 1;
  }

  console.log('[ok] Created ' + created + ' applications across every pipeline status');
  console.log('');
  console.log('Logins (all accounts): password = ' + ACCOUNT_PASSWORD);
  console.log('  admin:    ' + ADMIN_EMAIL);
  console.log('  employer: ' + COMPANIES[0].email);
  console.log('  student:  ' + STUDENTS[0].email);
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

