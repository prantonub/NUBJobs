import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { responses } from '../utils/response.utils';
import { matchBreakdown } from '../utils/match.utils';
import { emitToUser } from '../lib/socket-server';
import {
  PIPELINE_TRANSITIONS,
  buildApplicationTimeline,
  isApplicationStatus,
  type ApplicationStatusValue,
} from '../utils/application.utils';

export interface AuthRequest extends Request {
  userId?: string;
  email?: string;
  role?: string;
}

/** Mirrors the Prisma `JobStatus` enum — anything else must not reach Prisma. */
const JOB_STATUSES = ['DRAFT', 'PENDING', 'ACTIVE', 'CLOSED'];

function readJobStatus(value: unknown): string | null {
  const raw = Array.isArray(value) ? String(value[0] ?? '') : value === undefined || value === null ? '' : String(value);
  const upper = raw.trim().toUpperCase();
  return JOB_STATUSES.includes(upper) ? upper : null;
}

/**
 * GET /api/employer/dashboard/stats
 * Get employer dashboard statistics
 */
export async function getEmployerStats(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;

    if (!userId) {
      return responses.unauthorized(res);
    }

    // Get employer profile
    const employer = await prisma.employerProfile.findUnique({
      where: { userId },
    });

    if (!employer) {
      return responses.notFound(res, 'Employer profile not found');
    }

    // Get stats
    const [totalJobs, activeJobs, totalApplications, stats] = await Promise.all([
      prisma.job.count({ where: { employerId: employer.id } }),
      prisma.job.count({ where: { employerId: employer.id, status: 'ACTIVE' } }),
      prisma.application.count({
        where: { job: { employerId: employer.id } },
      }),
      prisma.application.groupBy({
        by: ['status'],
        where: { job: { employerId: employer.id } },
        _count: true,
      }),
    ]);

    // Count by status
    const statusCounts: Record<string, number> = {
      APPLIED: 0,
      REVIEWED: 0,
      SHORTLISTED: 0,
      INTERVIEWED: 0,
      HIRED: 0,
      REJECTED: 0,
    };

    stats.forEach((stat: any) => {
      if (stat.status in statusCounts) {
        statusCounts[stat.status] = stat._count;
      }
    });

    return responses.ok(res, 'Stats fetched', {
      totalJobs,
      activeJobs,
      totalApplications,
      statusCounts,
      companyName: employer.companyName,
      isVerified: employer.isVerified,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/employer/jobs
 * Get all jobs posted by employer
 */
export async function getEmployerJobs(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    const { status, sort = 'newest', page = 1, limit = 10 } = req.query;

    if (!userId) {
      return responses.unauthorized(res);
    }

    const employer = await prisma.employerProfile.findUnique({
      where: { userId },
    });

    if (!employer) {
      return responses.notFound(res, 'Employer profile not found');
    }

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const pageSize = Math.max(1, Math.min(50, parseInt(limit as string) || 10));
    const skip = (pageNum - 1) * pageSize;

    const where: any = { employerId: employer.id };
    // Only filter when a valid status was requested: `?status=` (or ALL) returns
    // every job, which is what the employer jobs table needs.
    const statusValue = readJobStatus(status);
    if (statusValue) where.status = statusValue;

    const orderBy: any =
      sort === 'oldest'
        ? { createdAt: 'asc' }
        : sort === 'applicants'
          ? { applicantCount: 'desc' }
          : sort === 'views'
            ? { views: 'desc' }
            : { createdAt: 'desc' };

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          _count: {
            select: { applications: true },
          },
          // Strongest applicants preview for the jobs table.
          applications: {
            take: 3,
            orderBy: { matchScore: 'desc' },
            select: {
              id: true,
              status: true,
              matchScore: true,
              student: {
                select: { id: true, cgpa: true, user: { select: { name: true } } },
              },
            },
          },
        },
        orderBy,
      }),
      prisma.job.count({ where }),
    ]);

    return responses.ok(res, 'Jobs fetched', {
      // `postedAt` / `topApplicants` are the documented aliases of
      // `createdAt` / `applications` for the employer jobs table.
      data: jobs.map((job) => ({
        ...job,
        postedAt: job.createdAt,
        topApplicants: job.applications ?? [],
      })),
      pagination: {
        total,
        page: pageNum,
        limit: pageSize,
        pages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/employer/jobs/:id
 * One of the employer's OWN postings. Returns 403 for any other employer's job.
 */
export async function getEmployerJobDetail(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    if (!userId) {
      return responses.unauthorized(res);
    }

    const idStr = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const employer = await prisma.employerProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!employer) {
      return responses.notFound(res, 'Employer profile not found');
    }

    const job = await prisma.job.findUnique({
      where: { id: idStr },
      include: {
        _count: { select: { applications: true } },
        applications: {
          take: 10,
          orderBy: { matchScore: 'desc' },
          select: {
            id: true,
            status: true,
            matchScore: true,
            createdAt: true,
            student: {
              select: { id: true, cgpa: true, skills: true, user: { select: { name: true } } },
            },
          },
        },
      },
    });

    if (!job) {
      return responses.notFound(res, 'Job not found');
    }

    // ── OWNERSHIP: an employer may only read their own posting ──────────────
    if (job.employerId !== employer.id) {
      return responses.forbidden(res, 'You can only manage your own jobs');
    }

    const grouped = await prisma.application.groupBy({
      by: ['status'],
      where: { jobId: job.id },
      _count: { _all: true },
    });

    return responses.ok(res, 'Job fetched', {
      ...job,
      postedAt: job.createdAt,
      topApplicants: job.applications,
      statusCounts: Object.fromEntries(
        grouped.map((row) => [row.status, row._count._all])
      ),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/employer/applications
 *
 * Two shapes from one endpoint:
 *   - default  → applications grouped by status (Kanban pipeline)
 *   - `?view=list` → flat, filterable, paginated list for the applications table
 *
 * Query: view, status, jobId, sort (newest|oldest|match), page, limit
 */
export async function getEmployerApplications(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;

    if (!userId) {
      return responses.unauthorized(res);
    }

    const employer = await prisma.employerProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!employer) {
      return responses.notFound(res, 'Employer profile not found');
    }

    const readParam = (value: unknown) =>
      Array.isArray(value) ? String(value[0] ?? '') : value === undefined || value === null ? '' : String(value);

    const wantsList = readParam(req.query.view) === 'list';
    const status = readParam(req.query.status).toUpperCase();
    const jobId = readParam(req.query.jobId);
    const sort = readParam(req.query.sort) || 'newest';
    const pageNum = Math.max(1, parseInt(readParam(req.query.page)) || 1);
    const pageSize = Math.max(1, Math.min(100, parseInt(readParam(req.query.limit)) || 20));

    const where: any = { job: { employerId: employer.id } };
    if (jobId) where.jobId = jobId;
    if (isApplicationStatus(status)) where.status = status;

    const include = {
      job: { select: { id: true, title: true, status: true } },
      student: {
        select: {
          id: true,
          cgpa: true,
          skills: true,
          photoUrl: true,
          department: true,
          resumeUrl: true,
          user: { select: { name: true, email: true } },
        },
      },
      // Latest message powers the "Last message" column in the table view.
      messages: {
        orderBy: { createdAt: 'desc' as const },
        take: 1,
        select: { id: true, content: true, createdAt: true, senderId: true, isRead: true },
      },
      _count: { select: { messages: true } },
    };

    if (!wantsList) {
      const applications = await prisma.application.findMany({
        where,
        include,
        orderBy: { createdAt: 'desc' },
      });

      const grouped: Record<string, any[]> = {
        APPLIED: [],
        REVIEWED: [],
        SHORTLISTED: [],
        INTERVIEWED: [],
        HIRED: [],
        REJECTED: [],
      };

      applications.forEach((application) => {
        if (application.status in grouped) grouped[application.status].push(application);
      });

      return responses.ok(res, 'Applications fetched', grouped);
    }

    const orderBy: any =
      sort === 'match'
        ? { matchScore: 'desc' }
        : sort === 'oldest'
          ? { createdAt: 'asc' }
          : { createdAt: 'desc' };

    const [rows, total, grouped] = await Promise.all([
      prisma.application.findMany({
        where,
        include,
        orderBy,
        skip: (pageNum - 1) * pageSize,
        take: pageSize,
      }),
      prisma.application.count({ where }),
      prisma.application.groupBy({
        by: ['status'],
        where: { job: { employerId: employer.id } },
        _count: { _all: true },
      }),
    ]);

    const stats: Record<string, number> = {
      APPLIED: 0,
      REVIEWED: 0,
      SHORTLISTED: 0,
      INTERVIEWED: 0,
      HIRED: 0,
      REJECTED: 0,
      WITHDRAWN: 0,
    };
    let totalApplications = 0;
    for (const row of grouped) {
      stats[row.status] = row._count._all;
      totalApplications += row._count._all;
    }

    return responses.ok(res, 'Applications fetched', {
      data: rows.map((row) => ({
        ...row,
        appliedAt: row.createdAt,
        lastMessage: row.messages[0] ?? null,
        // Flattened fields for the spec's table columns.
        studentName: row.student?.user?.name ?? null,
        jobTitle: row.job?.title ?? null,
        messageCount: row._count?.messages ?? 0,
      })),
      stats: { ...stats, total: totalApplications },
      pagination: {
        total,
        page: pageNum,
        limit: pageSize,
        pages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/employer/applications/:id
 * Get single application detail
 */
export async function getApplicationDetail(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const idStr = Array.isArray(id) ? id[0] : id;
    const userId = req.userId;

    if (!userId) {
      return responses.unauthorized(res);
    }

    const employer = await prisma.employerProfile.findUnique({
      where: { userId },
    });

    if (!employer) {
      return responses.notFound(res, 'Employer profile not found');
    }

    const application = await prisma.application.findUnique({
      where: { id: idStr },
      include: {
        job: { include: { employer: true } },
        student: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
        messages: {
          include: {
            sender: { select: { name: true, email: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!application) {
      return responses.notFound(res, 'Application not found');
    }

    // Check authorization
    if (application.job.employerId !== employer.id) {
      return responses.forbidden(res);
    }

    // Opening the thread marks the candidate's messages as read.
    await prisma.message.updateMany({
      where: { applicationId: idStr, senderId: { not: userId }, isRead: false },
      data: { isRead: true },
    });

    return responses.ok(res, 'Application fetched', {
      ...application,
      appliedAt: application.createdAt,
      matchBreakdown: matchBreakdown(application.student, application.job),
      timeline: buildApplicationTimeline(application),
      allowedTransitions: PIPELINE_TRANSITIONS[application.status as ApplicationStatusValue] ?? [],
      viewer: 'EMPLOYER',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/employer/applications/:id/status
 *
 * NOTE: the implementation lives in `applications-enhanced.controller.ts`
 * (`updateApplicationStatus`) so the employer route and
 * `PATCH /api/applications/:id/status` share ONE code path — pipeline rules,
 * student email, notification and the Socket.io event. The route imports it
 * directly; the controller was removed from this file on purpose.
 */

/**
 * POST /api/employer/applications/:id/schedule-interview
 * Schedule interview
 */
export async function scheduleInterview(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const idStr = Array.isArray(id) ? id[0] : id;
    const { date, time, link, notes } = req.body;
    const userId = req.userId;

    if (!userId) {
      return responses.unauthorized(res);
    }

    const employer = await prisma.employerProfile.findUnique({
      where: { userId },
    });

    if (!employer) {
      return responses.notFound(res, 'Employer profile not found');
    }

    const application = await prisma.application.findUnique({
      where: { id: idStr },
      include: { job: true, student: true },
    });

    if (!application) {
      return responses.notFound(res, 'Application not found');
    }

    if (application.job.employerId !== employer.id) {
      return responses.forbidden(res);
    }

    const interviewDate = new Date(`${date}T${time}`);

    const updated = await prisma.application.update({
      where: { id: idStr },
      data: {
        status: 'INTERVIEWED',
        interviewDate,
        interviewLink: link,
        notes,
      },
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId: application.student.userId,
        type: 'APPLICATION_STATUS_UPDATE',
        message: `Interview scheduled for ${application.job.title}`,
        link: `/applications/${idStr}`,
      },
    });

    return responses.ok(res, 'Interview scheduled', updated);
  } catch (error) {
    next(error);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// Employer dashboard overview (GET /api/employer/dashboard)
// ════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/employer/dashboard
 * Spec-shaped overview for the main employer dashboard. Every query is scoped
 * to `employerId`, so a company only ever sees its own numbers.
 */
export async function getEmployerDashboard(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    if (!userId) return responses.unauthorized(res);

    const employer = await prisma.employerProfile.findUnique({
      where: { userId },
      select: { id: true, companyName: true, logoUrl: true, isVerified: true },
    });
    if (!employer) return responses.notFound(res, 'Employer profile not found');

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const DAY_MS = 24 * 60 * 60 * 1000;

    const [totalJobs, totalApplications, statusGroups, recentJobsRaw, recentApplicationsRaw, hiredRows, monthJobs] =
      await Promise.all([
        prisma.job.count({ where: { employerId: employer.id } }),
        prisma.application.count({ where: { job: { employerId: employer.id } } }),
        prisma.application.groupBy({
          by: ['status'],
          where: { job: { employerId: employer.id } },
          _count: { _all: true },
        }),
        prisma.job.findMany({
          where: { employerId: employer.id },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            title: true,
            status: true,
            views: true,
            applicantCount: true,
            createdAt: true,
            _count: { select: { applications: true } },
          },
        }),
        prisma.application.findMany({
          where: { job: { employerId: employer.id } },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            status: true,
            matchScore: true,
            createdAt: true,
            student: { select: { user: { select: { name: true } } } },
            job: { select: { title: true } },
          },
        }),
        prisma.application.findMany({
          where: { job: { employerId: employer.id }, status: 'HIRED' },
          select: { createdAt: true, updatedAt: true },
          take: 500,
        }),
        prisma.job.findMany({
          where: { employerId: employer.id, createdAt: { gte: monthStart } },
          select: { views: true },
        }),
      ]);

    const statusCounts: Record<string, number> = {
      APPLIED: 0,
      REVIEWED: 0,
      SHORTLISTED: 0,
      INTERVIEWED: 0,
      HIRED: 0,
      REJECTED: 0,
    };
    for (const row of statusGroups) {
      if (row.status in statusCounts) statusCounts[row.status] = row._count._all;
    }

    const hired = statusCounts.HIRED ?? 0;
    // Views are tracked per job only, so "this month" = views on postings
    // created within the current calendar month.
    const viewsThisMonth = monthJobs.reduce((sum, job) => sum + job.views, 0);
    const acceptanceRate =
      totalApplications > 0 ? `${((hired / totalApplications) * 100).toFixed(1)}%` : '0.0%';
    const avgDays =
      hiredRows.length > 0
        ? Math.max(
            1,
            Math.round(
              hiredRows.reduce((sum, row) => sum + (row.updatedAt.getTime() - row.createdAt.getTime()) / DAY_MS, 0) /
                hiredRows.length
            )
          )
        : null;

    return responses.ok(res, 'Dashboard fetched', {
      overview: { totalJobs, totalApplications, hired, viewsThisMonth },
      recentJobs: recentJobsRaw.map((job) => ({
        id: job.id,
        title: job.title,
        status: job.status,
        applicants: job._count.applications ?? job.applicantCount,
        views: job.views,
        postedAt: job.createdAt,
      })),
      recentApplications: recentApplicationsRaw.map((application) => ({
        id: application.id,
        studentName: application.student?.user?.name ?? 'Candidate',
        jobTitle: application.job?.title ?? '',
        status: application.status,
        matchScore: application.matchScore,
        appliedAt: application.createdAt,
      })),
      stats: {
        avgTimeToHire: avgDays !== null ? `${avgDays} days` : 'N/A',
        acceptanceRate,
      },
      // Extras for the dashboard page (chart + header) — a superset of the
      // spec payload, so /dashboard/stats consumers keep working too.
      statusCounts,
      companyName: employer.companyName,
      logoUrl: employer.logoUrl,
      isVerified: employer.isVerified,
    });
  } catch (error) {
    next(error);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// Employer messaging (GET/POST /api/employer/messages[...])
// ════════════════════════════════════════════════════════════════════════════

/** Resolve this employer's most recent application with a student (profile id OR user id accepted). */
async function findMyApplicationWithStudent(employerId: string, studentParam: string) {
  return prisma.application.findFirst({
    where: {
      job: { employerId },
      OR: [{ studentId: studentParam }, { student: { userId: studentParam } }],
    },
    orderBy: { updatedAt: 'desc' },
    include: {
      student: {
        select: {
          id: true,
          photoUrl: true,
          cgpa: true,
          department: true,
          skills: true,
          resumeUrl: true,
          user: { select: { id: true, name: true, email: true } },
        },
      },
      job: { select: { id: true, title: true } },
    },
  });
}

/**
 * GET /api/employer/messages
 * Conversation list for the signed-in company: one entry per student who has
 * applied to any of the employer's jobs, sorted by most recent activity.
 */
export async function getEmployerMessages(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    if (!userId) return responses.unauthorized(res);

    const employer = await prisma.employerProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!employer) return responses.notFound(res, 'Employer profile not found');

    const [applications, unreadGroups] = await Promise.all([
      prisma.application.findMany({
        where: { job: { employerId: employer.id } },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          updatedAt: true,
          studentId: true,
          job: { select: { id: true, title: true } },
          student: {
            select: { id: true, photoUrl: true, user: { select: { id: true, name: true } } },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { content: true, createdAt: true, senderId: true },
          },
        },
      }),
      // Unread messages sent TO the employer, per conversation.
      prisma.message.groupBy({
        by: ['applicationId'],
        where: {
          isRead: false,
          senderId: { not: userId },
          application: { job: { employerId: employer.id } },
        },
        _count: { _all: true },
      }),
    ]);

    const unreadByApplication = new Map<string, number>();
    for (const row of unreadGroups) unreadByApplication.set(row.applicationId, row._count._all);

    // One row per student; extra applications only fold in their unread counts.
    const byStudent = new Map<string, any>();
    for (const application of applications) {
      const studentUserId = application.student.user.id;
      const unread = unreadByApplication.get(application.id) ?? 0;
      const existing = byStudent.get(studentUserId);
      if (existing) {
        existing.unreadCount += unread;
        continue;
      }
      const last = application.messages[0];
      byStudent.set(studentUserId, {
        studentId: application.student.id,
        studentUserId,
        studentName: application.student.user.name,
        studentPhoto: application.student.photoUrl,
        applicationId: application.id,
        jobTitle: application.job.title,
        lastMessage: last?.content ?? null,
        lastMessageTime: last?.createdAt ?? application.updatedAt,
        unreadCount: unread,
      });
    }

    const conversations = Array.from(byStudent.values()).sort(
      (a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    );

    return responses.ok(res, 'Conversations fetched', conversations);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/employer/messages/:studentId
 * Full thread with one student (all of their applications to this company).
 * `:studentId` accepts either the student-profile id or the user id.
 */
export async function getEmployerMessageThread(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    if (!userId) return responses.unauthorized(res);

    const employer = await prisma.employerProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!employer) return responses.notFound(res, 'Employer profile not found');

    const rawParam = Array.isArray(req.params.studentId)
      ? String(req.params.studentId[0])
      : String(req.params.studentId ?? '');
    const primary = await findMyApplicationWithStudent(employer.id, rawParam);
    if (!primary) return responses.notFound(res, 'No conversation with this student');

    const ownedApps = await prisma.application.findMany({
      where: { job: { employerId: employer.id }, studentId: primary.studentId },
      select: { id: true },
    });
    const applicationIds = ownedApps.map((application) => application.id);

    const messages = await prisma.message.findMany({
      where: { applicationId: { in: applicationIds } },
      include: { sender: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'asc' },
    });

    // Opening the thread marks the student's messages as read.
    await prisma.message.updateMany({
      where: { applicationId: { in: applicationIds }, senderId: { not: userId }, isRead: false },
      data: { isRead: true },
    });

    return responses.ok(res, 'Thread fetched', {
      messages,
      applicationId: primary.id,
      jobTitle: primary.job.title,
      studentProfile: primary.student,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/employer/messages/:studentId
 * Send a message to a student who applied to the employer's job. Emits
 * `new_message` to the student's user room for real-time delivery.
 */
export async function sendEmployerMessage(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    if (!userId) return responses.unauthorized(res);

    const employer = await prisma.employerProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!employer) return responses.notFound(res, 'Employer profile not found');

    const rawParam = Array.isArray(req.params.studentId)
      ? String(req.params.studentId[0])
      : String(req.params.studentId ?? '');
    const application = await findMyApplicationWithStudent(employer.id, rawParam);
    if (!application) {
      return responses.notFound(res, 'This student has not applied to your jobs');
    }

    const body = (req.body ?? {}) as { message?: unknown; content?: unknown };
    const content =
      typeof body.message === 'string' && body.message.trim()
        ? body.message.trim()
        : typeof body.content === 'string' && body.content.trim()
          ? body.content.trim()
          : '';
    if (!content) return responses.badRequest(res, 'Message text is required');

    const message = await prisma.message.create({
      data: { applicationId: application.id, senderId: userId, content, isRead: false },
      include: { sender: { select: { id: true, name: true, email: true } } },
    });

    // Real-time delivery to the student (their socket joins `user_<id>`).
    emitToUser(application.student.user.id, 'new_message', {
      message,
      applicationId: application.id,
      conversationId: application.id,
      sender: { id: userId, name: message.sender.name },
    });

    return responses.created(res, 'Message sent', message);
  } catch (error) {
    next(error);
  }
}


