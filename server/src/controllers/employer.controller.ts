import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { responses } from '../utils/response.utils';
import { matchBreakdown } from '../utils/match.utils';
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