import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { responses } from '../utils/response.utils';
import { hashPassword } from '../utils/password.utils';

export interface AdminRequest extends Request {
  userId?: string;
  email?: string;
  role?: string;
}

const getMonthLabel = (date: Date) => {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return monthNames[date.getMonth()];
};

const readSingleParam = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

export async function getAdminStats(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const [
      totalUsers,
      totalStudents,
      totalEmployers,
      totalAdmins,
      verifiedEmployers,
      activeJobs,
      pendingJobs,
      approvedJobs,
      rejectedJobs,
      totalApplications,
      acceptedApplications,
      interviewCount,
      totalMessages,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.user.count({ where: { role: 'EMPLOYER' } }),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.employerProfile.count({ where: { isVerified: true } }),
      prisma.job.count({ where: { status: 'ACTIVE' } }),
      prisma.job.count({ where: { status: 'PENDING' } }),
      prisma.job.count({ where: { status: 'ACTIVE' } }),
      prisma.job.count({ where: { status: 'CLOSED' } }),
      prisma.application.count(),
      prisma.application.count({ where: { status: 'HIRED' } }),
      prisma.application.count({ where: { status: 'INTERVIEWED' } }),
      prisma.message.count(),
    ]);

    return responses.ok(res, 'Admin stats fetched', {
      totalUsers,
      totalStudents,
      totalEmployers,
      totalAdmins,
      verifiedEmployers,
      activeJobs,
      pendingJobs,
      approvedJobs,
      rejectedJobs,
      totalApplications,
      acceptedApplications,
      interviewCount,
      totalMessages,
    });
  } catch (error) {
    next(error);
  }
}

export async function getAdminAnalytics(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const [applicationsByMonthRaw, jobsByCategoryRaw, skillsRaw, applicantsByDepartmentRaw] = await Promise.all([
      prisma.application.groupBy({
        by: ['createdAt'],
        _count: true,
      }),
      prisma.job.groupBy({
        by: ['category'],
        _count: true,
        where: { category: { not: null } },
      }),
      prisma.studentProfile.findMany({
        select: { skills: true },
      }),
      prisma.studentProfile.groupBy({
        by: ['department'],
        _count: true,
        where: { department: { not: null } },
      }),
    ]);

    const applicationsByMonth = Array.from({ length: 12 }, (_, index) => {
      const month = new Date(new Date().getFullYear(), index, 1);
      const label = getMonthLabel(month);
      const count = applicationsByMonthRaw.filter((item) => {
        const createdAt = item.createdAt instanceof Date ? item.createdAt : new Date(item.createdAt);
        return createdAt.getMonth() === index;
      }).reduce((sum, item) => sum + item._count, 0);

      return { month: label, count };
    });

    const jobsByCategory = jobsByCategoryRaw.map((item) => ({
      category: item.category || 'Uncategorized',
      count: item._count,
    }));

    const skillMap = new Map<string, number>();
    skillsRaw.forEach((profile) => {
      if (!profile.skills) return;
      profile.skills.forEach((skill) => {
        const key = skill.trim();
        if (!key) return;
        skillMap.set(key, (skillMap.get(key) || 0) + 1);
      });
    });

    const topSkills = Array.from(skillMap.entries())
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const applicantsByDepartment = applicantsByDepartmentRaw
      .filter((item) => item.department)
      .map((item) => ({
        department: item.department || 'Unknown',
        count: item._count,
      }))
      .sort((a, b) => b.count - a.count);

    return responses.ok(res, 'Admin analytics fetched', {
      applicationsByMonth,
      jobsByCategory,
      topSkills,
      applicantsByDepartment,
    });
  } catch (error) {
    next(error);
  }
}

export async function getAdminDatabaseOverview(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const [users, jobs, employers, applications, messages] = await Promise.all([
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 12,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isBanned: true,
          isEmailVerified: true,
          createdAt: true,
        },
      }),
      prisma.job.findMany({
        orderBy: { createdAt: 'desc' },
        take: 12,
        include: {
          employer: { select: { companyName: true } },
        },
      }),
      prisma.employerProfile.findMany({
        orderBy: { createdAt: 'desc' },
        take: 12,
        include: {
          user: { select: { name: true, email: true } },
        },
      }),
      prisma.application.findMany({
        orderBy: { createdAt: 'desc' },
        take: 12,
        include: {
          job: { select: { title: true } },
          student: { include: { user: { select: { name: true, email: true } } } },
        },
      }),
      prisma.message.findMany({
        orderBy: { createdAt: 'desc' },
        take: 12,
        include: {
          sender: { select: { name: true, email: true } },
          application: { select: { id: true } },
        },
      }),
    ]);

    const databaseSummary = {
      users: {
        total: await prisma.user.count(),
        rows: users,
      },
      jobs: {
        total: await prisma.job.count(),
        rows: jobs.map((job) => ({
          id: job.id,
          title: job.title,
          company: job.employer?.companyName ?? 'Unknown',
          status: job.status,
          type: job.type,
          createdAt: job.createdAt,
        })),
      },
      employers: {
        total: await prisma.employerProfile.count(),
        rows: employers.map((employer) => ({
          id: employer.id,
          companyName: employer.companyName,
          userName: employer.user?.name ?? 'Unknown',
          email: employer.user?.email ?? 'Unknown',
          isVerified: employer.isVerified,
          createdAt: employer.createdAt,
        })),
      },
      applications: {
        total: await prisma.application.count(),
        rows: applications.map((application) => ({
          id: application.id,
          status: application.status,
          jobTitle: application.job?.title ?? 'Unknown',
          studentName: application.student?.user?.name ?? 'Unknown',
          studentEmail: application.student?.user?.email ?? 'Unknown',
          createdAt: application.createdAt,
        })),
      },
      messages: {
        total: await prisma.message.count(),
        rows: messages.map((message) => ({
          id: message.id,
          sender: message.sender?.name ?? 'Unknown',
          applicationId: message.application?.id ?? 'Unknown',
          content: message.content,
          createdAt: message.createdAt,
        })),
      },
    };

    return responses.ok(res, 'Admin database overview fetched', databaseSummary);
  } catch (error) {
    next(error);
  }
}

export async function listUsers(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const search = readSingleParam(req.query.search as string | string[] | undefined) ?? '';
    const role = readSingleParam(req.query.role as string | string[] | undefined);
    const status = readSingleParam(req.query.status as string | string[] | undefined);

    const users = await prisma.user.findMany({
      where: {
        ...(role ? { role: role as any } : {}),
        ...(status === 'BANNED' ? { isBanned: true } : {}),
        ...(status === 'ACTIVE' ? { isBanned: false } : {}),
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isBanned: true,
        isEmailVerified: true,
        createdAt: true,
        studentProfile: { select: { department: true, cgpa: true } },
        employerProfile: { select: { companyName: true, isVerified: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return responses.ok(res, 'Users fetched', users);
  } catch (error) {
    next(error);
  }
}

export async function updateUserRole(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const id = readSingleParam(req.params.id) ?? '';
    const { role } = req.body;

    if (!id) {
      return responses.badRequest(res, 'User id is required');
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role },
    });

    return responses.ok(res, 'User role updated', user);
  } catch (error) {
    next(error);
  }
}

export async function toggleUserBan(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const id = readSingleParam(req.params.id) ?? '';
    const { isBanned } = req.body;

    if (!id) {
      return responses.badRequest(res, 'User id is required');
    }

    const user = await prisma.user.update({
      where: { id },
      data: { isBanned: Boolean(isBanned) },
    });

    return responses.ok(res, `User ${user.isBanned ? 'banned' : 'unbanned'}`, user);
  } catch (error) {
    next(error);
  }
}

export async function deleteUser(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const id = readSingleParam(req.params.id) ?? '';

    if (!id) {
      return responses.badRequest(res, 'User id is required');
    }

    await prisma.user.delete({ where: { id } });

    return responses.ok(res, 'User deleted');
  } catch (error) {
    next(error);
  }
}

export async function listJobs(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const jobs = await prisma.job.findMany({
      include: {
        employer: { include: { user: { select: { name: true, email: true } } } },
        _count: { select: { applications: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return responses.ok(res, 'Jobs fetched', jobs);
  } catch (error) {
    next(error);
  }
}

export async function createAdminJob(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const {
      title,
      description,
      employerId,
      category,
      type = 'FULL_TIME',
      location,
      salaryMin,
      salaryMax,
      minCgpa,
      skills = [],
      deadline,
      targetUniversity = 'ALL',
      status = 'PENDING',
    } = req.body;

    if (!title || !description) {
      return responses.badRequest(res, 'Title and description are required');
    }

    let targetEmployerId = employerId;
    if (!targetEmployerId) {
      const fallbackEmployer = await prisma.employerProfile.findFirst({
        orderBy: { createdAt: 'desc' },
      });

      if (!fallbackEmployer) {
        return responses.badRequest(res, 'Create a company before posting a job.');
      }

      targetEmployerId = fallbackEmployer.id;
    }

    const created = await prisma.job.create({
      data: {
        employerId: targetEmployerId,
        title,
        description,
        category: category || null,
        type,
        location: location || null,
        salaryMin: salaryMin ?? null,
        salaryMax: salaryMax ?? null,
        minCgpa: minCgpa ?? null,
        skills: Array.isArray(skills) ? skills : [],
        deadline: deadline ? new Date(deadline) : null,
        targetUniversity,
        status: status === 'DRAFT' ? 'DRAFT' : status === 'ACTIVE' ? 'ACTIVE' : 'PENDING',
      },
      include: {
        employer: { include: { user: { select: { name: true, email: true } } } },
      },
    });

    return responses.created(res, 'Job created by admin', created);
  } catch (error) {
    next(error);
  }
}

export async function deleteAdminJob(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const id = readSingleParam(req.params.id) ?? '';

    if (!id) {
      return responses.badRequest(res, 'Job id is required');
    }

    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) {
      return responses.notFound(res, 'Job not found');
    }

    await prisma.job.delete({ where: { id } });
    return responses.ok(res, 'Job deleted by admin');
  } catch (error) {
    next(error);
  }
}

export async function updateJobStatus(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const id = readSingleParam(req.params.id) ?? '';
    const { status, reason } = req.body;

    if (!id) {
      return responses.badRequest(res, 'Job id is required');
    }

    const job = await prisma.job.update({
      where: { id },
      data: {
        status: status === 'APPROVED' ? 'ACTIVE' : 'CLOSED',
      },
    });

    return responses.ok(res, `Job ${status === 'APPROVED' ? 'approved' : 'rejected'}`, {
      job,
      reason,
    });
  } catch (error) {
    next(error);
  }
}

export async function toggleJobFeature(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const id = readSingleParam(req.params.id) ?? '';

    if (!id) {
      return responses.badRequest(res, 'Job id is required');
    }

    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) {
      return responses.notFound(res, 'Job not found');
    }

    const updated = await prisma.job.update({
      where: { id },
      data: { featured: !job.featured },
    });

    return responses.ok(res, `Job ${updated.featured ? 'featured' : 'unfeatured'}`, updated);
  } catch (error) {
    next(error);
  }
}

export async function listEmployers(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const employers = await prisma.employerProfile.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        _count: { select: { jobs: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return responses.ok(res, 'Employers fetched', employers);
  } catch (error) {
    next(error);
  }
}

export async function createAdminCompany(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const {
      companyName,
      about,
      website,
      linkedinUrl,
      email,
      name,
      password,
    } = req.body;

    if (!companyName || !email || !name) {
      return responses.badRequest(res, 'Company name, admin name, and email are required');
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return responses.conflict(res, 'A company user with this email already exists');
    }

    const hashedPassword = await hashPassword(password || 'Password123!');

    const created = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name,
        password: hashedPassword,
        role: 'EMPLOYER',
        isEmailVerified: true,
        employerProfile: {
          create: {
            companyName,
            about: about || '',
            website: website || null,
            linkedinUrl: linkedinUrl || null,
            isVerified: true,
          },
        },
      },
      include: {
        employerProfile: true,
      },
    });

    return responses.created(res, 'Company created by admin', created);
  } catch (error) {
    next(error);
  }
}

export async function deleteAdminCompany(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const id = readSingleParam(req.params.id) ?? '';

    if (!id) {
      return responses.badRequest(res, 'Company id is required');
    }

    const employer = await prisma.employerProfile.findUnique({ where: { id } });
    if (!employer) {
      return responses.notFound(res, 'Company not found');
    }

    await prisma.user.delete({ where: { id: employer.userId } });
    return responses.ok(res, 'Company deleted by admin');
  } catch (error) {
    next(error);
  }
}

export async function updateEmployerVerification(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const id = readSingleParam(req.params.id) ?? '';
    const { approved, note } = req.body;

    if (!id) {
      return responses.badRequest(res, 'Employer id is required');
    }

    const employer = await prisma.employerProfile.update({
      where: { id },
      data: {
        isVerified: Boolean(approved),
      },
      include: {
        user: true,
      },
    });

    return responses.ok(res, approved ? 'Employer verified' : 'Employer verification rejected', {
      employer,
      note,
    });
  } catch (error) {
    next(error);
  }
}
