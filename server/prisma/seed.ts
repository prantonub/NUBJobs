import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  await prisma.message.deleteMany();
  await prisma.eventRsvp.deleteMany();
  await prisma.campusEvent.deleteMany();
  await prisma.application.deleteMany();
  await prisma.savedJob.deleteMany();
  await prisma.job.deleteMany();
  await prisma.studentProfile.deleteMany();
  await prisma.employerProfile.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('Password123!', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@nubjobs.local',
      name: 'System Admin',
      password: passwordHash,
      role: 'ADMIN',
      isEmailVerified: true,
    },
  });

  const employerNames = ['Brain Station 23', 'BJIT', 'Shajgoj', 'Pathao', 'Shohoz'];
  const employers: any[] = [];

  for (const companyName of employerNames) {
    const employerUser = await prisma.user.create({
      data: {
        email: `${companyName.toLowerCase().replace(/\s+/g, '')}@example.com`,
        name: companyName,
        password: passwordHash,
        role: 'EMPLOYER',
        isEmailVerified: true,
        employerProfile: {
          create: {
            companyName,
            about: `${companyName} is building products and platforms for modern digital experiences.`,
            website: `https://${companyName.toLowerCase().replace(/\s+/g, '')}.com`,
            linkedinUrl: `https://linkedin.com/company/${companyName.toLowerCase().replace(/\s+/g, '')}`,
            isVerified: true,
          },
        },
      },
      include: { employerProfile: true },
    });

    employers.push(employerUser.employerProfile!);
  }

  const studentSeedData = [
    { name: 'Aisha Rahman', email: 'aisha@gmail.com', department: 'CSE', cgpa: 3.82 },
    { name: 'Rafi Karim', email: 'rafi@gmail.com', department: 'EEE', cgpa: 3.71 },
    { name: 'Sadia Sultana', email: 'sadia@gmail.com', department: 'BBA', cgpa: 3.63 },
    { name: 'Nafis Ahmed', email: 'nafis@gmail.com', department: 'CSE', cgpa: 3.91 },
    { name: 'Hasan Mahmud', email: 'hasan@gmail.com', department: 'CIVIL', cgpa: 3.44 },
    { name: 'Mim Akter', email: 'mim@gmail.com', department: 'TEXTILE', cgpa: 3.7 },
    { name: 'Soumik Das', email: 'soumik@gmail.com', department: 'CSE', cgpa: 3.68 },
    { name: 'Riya Chowdhury', email: 'riya@gmail.com', department: 'LAW', cgpa: 3.58 },
    { name: 'Tanzim Islam', email: 'tanzim@gmail.com', department: 'EEE', cgpa: 3.8 },
    { name: 'Shadman Hossain', email: 'shadman@gmail.com', department: 'CSE', cgpa: 3.74 },
    { name: 'Nabila Noor', email: 'nabila@gmail.com', department: 'ARCH', cgpa: 3.53 },
    { name: 'Ishrat Jahan', email: 'ishrat@gmail.com', department: 'BBA', cgpa: 3.66 },
    { name: 'Zahidul Hasan', email: 'zahidul@gmail.com', department: 'CSE', cgpa: 3.89 },
    { name: 'Maliha Akter', email: 'maliha@gmail.com', department: 'EEE', cgpa: 3.77 },
    { name: 'Fahim Reza', email: 'fahim@gmail.com', department: 'CSE', cgpa: 3.95 },
  ];

  const studentProfiles: any[] = [];

  for (const student of studentSeedData) {
    const user = await prisma.user.create({
      data: {
        email: student.email,
        name: student.name,
        password: passwordHash,
        role: 'STUDENT',
        isEmailVerified: true,
        studentProfile: {
          create: {
            department: student.department,
            cgpa: student.cgpa,
            skills: ['JavaScript', 'React', 'Teamwork', 'Problem Solving'].slice(0, 3),
            bio: `${student.name} is a final-year student passionate about product engineering and innovation.`,
            location: 'Dhaka',
            phone: '+8801700000000',
          },
        },
      },
      include: { studentProfile: true },
    });

    studentProfiles.push(user.studentProfile!);
  }

  const jobTemplates = [
    { title: 'Frontend Engineer', category: 'Software', type: 'FULL_TIME', salaryMin: 45000, salaryMax: 65000 },
    { title: 'Backend Developer', category: 'Software', type: 'FULL_TIME', salaryMin: 50000, salaryMax: 70000 },
    { title: 'Product Designer', category: 'Design', type: 'FULL_TIME', salaryMin: 40000, salaryMax: 60000 },
    { title: 'QA Engineer', category: 'Software', type: 'FULL_TIME', salaryMin: 35000, salaryMax: 50000 },
    { title: 'Data Analyst', category: 'Data', type: 'FULL_TIME', salaryMin: 42000, salaryMax: 60000 },
    { title: 'Mobile App Developer', category: 'Software', type: 'INTERNSHIP', salaryMin: 20000, salaryMax: 30000 },
    { title: 'Digital Marketing Executive', category: 'Marketing', type: 'PART_TIME', salaryMin: 25000, salaryMax: 40000 },
    { title: 'Operations Associate', category: 'Operations', type: 'FULL_TIME', salaryMin: 30000, salaryMax: 45000 },
  ];

  const jobs: any[] = [];

  for (let i = 0; i < 30; i++) {
    const template = jobTemplates[i % jobTemplates.length];
    const employer = employers[i % employers.length];
    const createdJob = await prisma.job.create({
      data: {
        title: `${template.title} ${i + 1}`,
        description: `We are looking for a motivated candidate to join our team and help build scalable digital services.`,
        category: template.category,
        type: template.type,
        location: i % 2 === 0 ? 'Dhaka' : 'Chattogram',
        salaryMin: template.salaryMin,
        salaryMax: template.salaryMax,
        minCgpa: 2.8 + (i % 5) * 0.2,
        skills: ['React', 'Node.js', 'SQL', 'Problem Solving', 'Communication'],
        targetUniversity: 'NUB',
        status: i % 4 === 0 ? 'PENDING' : 'ACTIVE',
        employerId: employer.id,
        publishedAt: new Date(),
      },
    });

    jobs.push(createdJob);
  }

  const applicationStatuses = ['APPLIED', 'REVIEWED', 'SHORTLISTED', 'INTERVIEWED', 'HIRED', 'REJECTED', 'WITHDRAWN'];

  for (let i = 0; i < 80; i++) {
    const student = studentProfiles[i % studentProfiles.length];
    const job = jobs[i % jobs.length];
    const status = applicationStatuses[i % applicationStatuses.length];

    await prisma.application.create({
      data: {
        jobId: job.id,
        studentId: student.id,
        coverLetter: 'I am excited to apply for this opportunity and contribute to your team.',
        matchScore: 60 + (i % 40),
        status: status as any,
        notes: i % 3 === 0 ? 'Strong candidate profile.' : null,
      },
    });
  }

  const users = await prisma.user.findMany({
    include: { sentMessages: true },
  });

  for (let i = 0; i < 20; i++) {
    const from = users[i % users.length];
    const to = users[(i + 1) % users.length];
    const app = await prisma.application.findFirst();

    if (app) {
      await prisma.message.create({
        data: {
          applicationId: app.id,
          senderId: from.id,
          content: `Message ${i + 1}: This is a sample conversation for follow-up and recruitment updates.`,
          isRead: i % 2 === 0,
        },
      });
    }
  }

  for (let i = 0; i < 3; i++) {
    await prisma.campusEvent.create({
      data: {
        title: ['Career Bootcamp', 'Hackathon Night', 'Employer Meetup'][i],
        description: 'A dynamic campus event designed to help students learn, connect, and apply for opportunities.',
        eventDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * (i + 10)),
        location: i === 0 ? 'NUB Auditorium' : i === 1 ? 'Innovation Lab' : 'Business Hub',
        capacity: 120 + i * 20,
        minCgpa: 2.5,
        organizerId: admin.id,
      },
    });
  }

  console.log('Seed completed: admin, employers, students, jobs, applications, messages, and events created.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
