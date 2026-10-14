import { emitToUser } from '../lib/socket-server';

import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { responses } from '../utils/response.utils';
import { hashPassword } from '../utils/password.utils';
import { logAdminAction, notifyUser, parsePageLimit, paginationMeta } from './admin-spec.helpers';
import { sendVerificationDecisionEmail } from '../services/email.service';

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

const JOB_TYPES = ['FULL_TIME', 'PART_TIME', 'INTERNSHIP', 'CONTRACT', 'REMOTE', 'HYBRID'] as const;
type JobTypeValue = (typeof JOB_TYPES)[number];

/** Keep only values that exist in the Prisma `JobType` enum, default FULL_TIME. */
const normalizeJobType = (raw: unknown): JobTypeValue => {
  const value = String(raw ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  return (JOB_TYPES as readonly string[]).includes(value)
    ? (value as JobTypeValue)
    : 'FULL_TIME';
};


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

    // Admin-created jobs are visible on the public job page unless explicitly
    // saved as a draft or sent for review.
    const isPublicJob = status === 'ACTIVE' || status === 'APPROVED';

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
        type: normalizeJobType(type),
        location: location || null,
        salaryMin: salaryMin ?? null,
        salaryMax: salaryMax ?? null,
        minCgpa: minCgpa ?? null,
        skills: Array.isArray(skills) ? skills : [],
        deadline: deadline ? new Date(deadline) : null,
        targetUniversity,
        status: isPublicJob ? 'ACTIVE' : 'PENDING',
        publishedAt: isPublicJob ? new Date() : null,
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

    const existing = await prisma.job.findUnique({
      where: { id },
      include: { employer: { select: { userId: true, companyName: true } } },
    });
    if (!existing) {
      return responses.notFound(res, 'Job not found');
    }

    const job = await prisma.job.update({
      where: { id },
      data: {
        status: status === 'APPROVED' ? 'ACTIVE' : 'CLOSED',
        ...(status === 'APPROVED' ? { publishedAt: new Date() } : {}),
      },
    });

    // Tell the employer their posting was reviewed (notification + real-time).
    await prisma.notification.create({
      data: {
        userId: existing.employer.userId,
        type: 'JOB_ALERT',
        message:
          status === 'APPROVED'
            ? `Your job "${existing.title}" is now live`
            : `Your job "${existing.title}" was rejected${reason ? `: ${reason}` : ''}`,
        link: `/employer/jobs/${existing.id}`,
      },
    });

    emitToUser(existing.employer.userId, status === 'APPROVED' ? 'job_approved' : 'job_rejected', {
      jobId: existing.id,
      jobTitle: existing.title,
      companyName: existing.employer.companyName,
      reason: status === 'APPROVED' ? null : reason ?? null,
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

    const existing = await prisma.employerProfile.findUnique({
      where: { id },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
    if (!existing) {
      return responses.notFound(res, 'Employer not found');
    }

    const employer = await prisma.employerProfile.update({
      where: { id },
      data: {
        isVerified: Boolean(approved),
        verifiedAt: approved ? new Date() : null,
        // A decision clears the pending request so the employer can resubmit.
        verificationRequest: null,
      },
      include: {
        user: true,
      },
    });

    // Notify the employer (notification + real-time)
    await prisma.notification.create({
      data: {
        userId: existing.user.id,
        type: 'JOB_ALERT',
        message: approved
          ? `Your company "${existing.companyName}" is now verified`
          : `Your company verification was not approved${note ? `: ${note}` : ''}`,
        link: '/employer/company',
      },
    });
    emitToUser(
      existing.user.id,
      approved ? 'company_verified' : 'company_verification_rejected',
      { companyName: existing.companyName, note: note ?? null }
    );

    return responses.ok(res, approved ? 'Employer verified' : 'Employer verification rejected', {
      employer,
      note,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/admin/employers/:id/reject
 * Explicit reject-verification endpoint (spec). Same side effects as
 * updateEmployerVerification with approved=false, but takes a `reason`.
 */
export async function rejectEmployerVerification(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const id = readSingleParam(req.params.id) ?? '';
    const { reason } = req.body;

    if (!id) {
      return responses.badRequest(res, 'Employer id is required');
    }

    const existing = await prisma.employerProfile.findUnique({
      where: { id },
      include: { user: { select: { id: true } } },
    });
    if (!existing) {
      return responses.notFound(res, 'Employer not found');
    }

    const employer = await prisma.employerProfile.update({
      where: { id },
      data: {
        isVerified: false,
        verifiedAt: null,
        verificationRequest: null,
      },
    });

    await prisma.notification.create({
      data: {
        userId: existing.user.id,
        type: 'JOB_ALERT',
        message: `Your company verification was rejected${reason ? `: ${reason}` : ''}`,
        link: '/employer/company',
      },
    });
    emitToUser(existing.user.id, 'company_verification_rejected', {
      companyName: existing.companyName,
      reason: reason ?? null,
    });

    return responses.ok(res, 'Employer verification rejected', {
      employer,
      reason,
    });
  } catch (error) {
    next(error);
  }
}
// ============================================
// PROFILE VERIFICATIONS - system-admin review queue (students + employers)
// ============================================

/** Same 8 sections as GET /api/profile/completion - shown in the admin queue. */
function studentCompletionPct(profile: {
  photoUrl: string | null; phone: string | null; location: string | null; bio: string | null;
  nubId: string | null; cgpa: number | null; skills: string[]; linkedinUrl: string | null;
  portfolioUrl: string | null; githubUrl: string | null; resumeUrl: string | null;
}): number {
  const sections = [
    !!profile.photoUrl,
    !!(profile.phone && profile.location && profile.bio),
    !!(profile.nubId && profile.cgpa),
    (profile.skills?.length ?? 0) > 0,
    !!profile.linkedinUrl,
    !!profile.portfolioUrl,
    !!profile.githubUrl,
    !!profile.resumeUrl,
  ];
  return Math.round((sections.filter(Boolean).length / sections.length) * 100);
}

/**
 * GET /api/admin/verifications?status=PENDING|APPROVED|REJECTED&role=ALL|STUDENT|EMPLOYER
 * One review queue for both profile types (admin has no direct DB access - spec).
 */
export async function listProfileVerifications(req: Request, res: Response, next: NextFunction) {
  try {
    const status = String(req.query.status ?? 'PENDING').toUpperCase();
    const role = String(req.query.role ?? 'ALL').toUpperCase();
    const search = String(req.query.search ?? '').trim();
    const { page, limit, skip } = parsePageLimit(req.query);

    type Row = {
      id: string; userId: string; kind: 'STUDENT' | 'EMPLOYER'; name: string; email: string;
      photo: string | null; isVerified: boolean; submittedAt: string | null; verifiedAt: string | null;
      rejectReason: string | null; completion: number | null; detail: Record<string, unknown>;
    };
    const rows: Row[] = [];

    if (role === 'ALL' || role === 'STUDENT') {
      const where: any = {
        ...(status === 'PENDING'
          ? { isVerified: false, verificationRequest: { not: null } }
          : status === 'APPROVED'
            ? { isVerified: true }
            : { isVerified: false, verificationRequest: null, verificationRejectReason: { not: null } }),
        ...(search
          ? { user: { OR: [{ name: { contains: search, mode: 'insensitive' as const } }, { email: { contains: search, mode: 'insensitive' as const } }] } }
          : {}),
      };
      const students = await prisma.studentProfile.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
      });
      for (const s of students) {
        rows.push({
          id: s.id,
          userId: s.user.id,
          kind: 'STUDENT',
          name: s.user.name,
          email: s.user.email,
          photo: s.photoUrl ?? s.user.avatarUrl,
          isVerified: s.isVerified,
          submittedAt: s.verificationRequest?.toISOString() ?? null,
          verifiedAt: s.verifiedAt?.toISOString() ?? null,
          rejectReason: s.verificationRejectReason,
          completion: studentCompletionPct(s),
          detail: {
            nubId: s.nubId, cgpa: s.cgpa, department: s.department, location: s.location,
            bio: s.bio, phone: s.phone, skills: s.skills, resumeUrl: s.resumeUrl, photoUrl: s.photoUrl,
            linkedinUrl: s.linkedinUrl, githubUrl: s.githubUrl, portfolioUrl: s.portfolioUrl,
          },
        });
      }
    }

    if (role === 'ALL' || role === 'EMPLOYER') {
      const where: any = {
        ...(status === 'PENDING'
          ? { isVerified: false, verificationRequest: { not: null } }
          : status === 'APPROVED'
            ? { isVerified: true }
            : { isVerified: false, verificationStatus: 'REJECTED' }),
        ...(search
          ? { OR: [{ companyName: { contains: search, mode: 'insensitive' as const } }, { user: { email: { contains: search, mode: 'insensitive' as const } } }] }
          : {}),
      };
      const employers = await prisma.employerProfile.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
      });
      for (const e of employers) {
        let submittedAt: string | null = null;
        let reqDoc = '';
        let reqReason: string | null = null;
        let reqReg: string | null = null;
        if (e.verificationRequest) {
          try {
            const parsed = JSON.parse(e.verificationRequest) as {
              requestedAt?: string; documentType?: string; reason?: string | null; registrationNumber?: string | null;
            };
            submittedAt = parsed.requestedAt ? new Date(parsed.requestedAt).toISOString() : null;
            reqDoc = parsed.documentType ?? '';
            reqReason = parsed.reason ?? null;
            reqReg = parsed.registrationNumber ?? null;
          } catch {
            submittedAt = null;
          }
        }
        rows.push({
          id: e.id,
          userId: e.user.id,
          kind: 'EMPLOYER',
          name: e.companyName,
          email: e.email ?? e.user.email,
          photo: e.logoUrl,
          isVerified: e.isVerified,
          submittedAt,
          verifiedAt: e.verifiedAt?.toISOString() ?? null,
          rejectReason: e.verificationRejectReason,
          completion: null,
          detail: {
            location: e.location, industry: e.industry, website: e.website, about: e.about,
            email: e.email ?? e.user.email, phone: e.phone, logoUrl: e.logoUrl,
            employees: e.employees, foundedYear: e.foundedYear,
            linkedinUrl: e.linkedinUrl, twitterUrl: e.twitterUrl, facebookUrl: e.facebookUrl,
            verificationDocument: e.verificationDocument, verificationStatus: e.verificationStatus,
            requestDocumentType: reqDoc || null, requestReason: reqReason, requestRegistrationNumber: reqReg,
          },
        });
      }
    }

    rows.sort((a, b) => (b.submittedAt ?? '').localeCompare(a.submittedAt ?? ''));
    const total = rows.length;
    return responses.ok(res, 'Verification queue', {
      data: rows.slice(skip, skip + limit),
      pagination: paginationMeta(total, page, limit),
    });
  } catch (error) {
    next(error);
  }
}

/** Shared approve/reject impl for both profile kinds. */
async function decideVerification(req: Request, res: Response, next: NextFunction, approved: boolean) {
  try {
    const kindRaw = Array.isArray(req.params.kind) ? req.params.kind[0] : req.params.kind;
    const kind = String(kindRaw ?? '').toLowerCase();
    const id = String(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id ?? '');
    const reason = String((req.body as any)?.reason ?? '').trim() || null;

    if (!['student', 'employer'].includes(kind)) {
      return responses.badRequest(res, 'Kind must be student or employer');
    }
    if (!id) return responses.badRequest(res, 'Profile id is required');
    if (!approved && !reason) return responses.badRequest(res, 'A rejection reason is required');
    if (kind === 'student') {
      const profile = await prisma.studentProfile.findUnique({
        where: { id },
        include: { user: { select: { id: true, name: true, email: true } } },
      });
      if (!profile) return responses.notFound(res, 'Student profile not found');

      const updated = await prisma.studentProfile.update({
        where: { id },
        data: {
          isVerified: approved,
          verifiedAt: approved ? new Date() : null,
          verificationRequest: null,
          verificationRejectReason: approved ? null : reason,
        },
      });

      await sendVerificationDecisionEmail(profile.user.email, profile.user.name, approved, reason ?? undefined).catch(() => {});
      await notifyUser(
        profile.user.id,
        'JOB_ALERT',
        approved
          ? 'Your profile is now verified - the blue badge is live on NUBJobs'
          : ('Profile verification was rejected' + (reason ? ': ' + reason : '')),
        '/profile'
      );
      emitToUser(profile.user.id, approved ? 'profile_verified' : 'profile_verification_rejected', { role: 'STUDENT' });
      await logAdminAction(req, approved ? 'verify_profile' : 'reject_profile', 'user', profile.user.id, reason);
      return responses.ok(res, approved ? 'Profile verified' : 'Profile verification rejected', updated);
    }

    const employer = await prisma.employerProfile.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    if (!employer) return responses.notFound(res, 'Company profile not found');

    const updated = await prisma.employerProfile.update({
      where: { id },
      data: {
        isVerified: approved,
        verifiedAt: approved ? new Date() : null,
        verificationRequest: null,
        verificationStatus: approved ? 'APPROVED' : 'REJECTED',
        verificationRejectReason: approved ? null : reason,
      },
    });

    await sendVerificationDecisionEmail(employer.user.email, employer.companyName, approved, reason ?? undefined).catch(() => {});
    await notifyUser(
      employer.user.id,
      approved ? 'COMPANY_VERIFIED' : 'COMPANY_VERIFICATION_REJECTED',
      approved
        ? ('Your company "' + employer.companyName + '" is now verified - the blue badge is live on NUBJobs')
        : ('Company verification was rejected' + (reason ? ': ' + reason : '')),
      '/employer/company'
    );
    emitToUser(employer.user.id, approved ? 'company_verified' : 'company_verification_rejected', { companyName: employer.companyName, reason });
    await logAdminAction(req, approved ? 'verify_company' : 'reject_company', 'company', id, reason);
    return responses.ok(res, approved ? 'Company verified' : 'Company verification rejected', updated);
  } catch (error) {
    next(error);
  }
}

/** PATCH /api/admin/verifications/:kind/:id/approve */
export async function approveProfileVerification(req: Request, res: Response, next: NextFunction) {
  return decideVerification(req, res, next, true);
}

/** PATCH /api/admin/verifications/:kind/:id/reject */
export async function rejectProfileVerification(req: Request, res: Response, next: NextFunction) {
  return decideVerification(req, res, next, false);
}
