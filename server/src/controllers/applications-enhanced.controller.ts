import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { responses } from '../utils/response.utils';
import {
  sendApplicationReceivedEmail,
  sendApplicationStatusEmail,
  sendNewApplicationEmail,
} from '../services/email.service';
import { emitToUser } from '../lib/socket-server';
import { matchBreakdown } from '../utils/match.utils';
import {
  APPLICATION_STATUSES,
  PIPELINE_TRANSITIONS,
  TERMINAL_STATUSES,
  buildApplicationTimeline,
  isApplicationStatus,
  validateStatusTransition,
  type ApplicationStatusValue,
} from '../utils/application.utils';

export interface AuthRequest extends Request {
  userId?: string;
  email?: string;
  role?: string;
}

/** Express 5 query values can be arrays — normalise everything to a string. */
function readParam(value: unknown): string {
  if (Array.isArray(value)) return String(value[0] ?? '');
  return value === undefined || value === null ? '' : String(value);
}

function buildPagination(total: number, page: number, limit: number) {
  return { total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) };
}

/** Employer fields every application row needs (identity + logo + badge). */
const EMPLOYER_PUBLIC_SELECT = {
  companyName: true,
  logoUrl: true,
  isVerified: true,
  location: true,
} as const;

/** Public student fields for employer-facing lists / detail pages. */
const STUDENT_PUBLIC_SELECT = {
  id: true,
  cgpa: true,
  skills: true,
  photoUrl: true,
  department: true,
  location: true,
  resumeUrl: true,
} as const;

/** Empty counts for every status — keeps the dashboard cards stable. */
function emptyStatusCounts(): Record<string, number> {
  return Object.fromEntries(APPLICATION_STATUSES.map((status) => [status, 0]));
}

/**
 * POST /api/applications
 * Apply for a job (student only) with 6-layer validation + full side effects:
 * DB row, applicant counter, both emails, both notifications, employer socket.
 */
export async function createApplication(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    if (!userId) {
      return responses.unauthorized(res);
    }

    const { jobId, coverLetter } = req.body;

    if (!jobId) {
      return responses.badRequest(res, 'Job ID required');
    }

    // Student profile feeds the match score and provides the resume snapshot.
    const student = await prisma.studentProfile.findUnique({
      where: { userId },
      select: { id: true, cgpa: true, skills: true, resumeUrl: true },
    });

    if (!student) {
      return responses.notFound(res, 'Student profile not found. Complete your profile first.');
    }

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        employer: {
          select: {
            userId: true,
            companyName: true,
            email: true,
            user: { select: { email: true } },
          },
        },
      },
    });

    if (!job) {
      return responses.notFound(res, 'Job not found');
    }

    // Validation 0: banned accounts cannot apply
    const account = await prisma.user.findUnique({
      where: { id: userId },
      select: { isBanned: true },
    });
    if (account?.isBanned) {
      return responses.forbidden(res, 'Your account is banned. You cannot apply for jobs.');
    }

    // Validation 1: job must be open for applications
    if (job.status !== 'ACTIVE') {
      return responses.badRequest(res, 'This job is no longer accepting applications');
    }

    // Validation 2: one application per student per job
    const existing = await prisma.application.findUnique({
      where: { jobId_studentId: { jobId, studentId: student.id } },
    });

    if (existing) {
      return responses.badRequest(res, 'You have already applied to this job');
    }

    // Validation 3: CGPA requirement
    if (job.minCgpa && (!student.cgpa || student.cgpa < job.minCgpa)) {
      return responses.badRequest(
        res,
        `Minimum CGPA required: ${job.minCgpa}. Your CGPA: ${student.cgpa ?? 'not set'}`
      );
    }

    // Validation 4: deadline
    if (job.deadline && new Date() > job.deadline) {
      return responses.badRequest(res, 'The application deadline has passed');
    }

    // Validation 5: resume required so the employer has something to review
    if (!student.resumeUrl) {
      return responses.badRequest(res, 'Upload a resume to your profile before applying');
    }

    // Validation 6: match score — shared formula so the persisted number equals
    // the one shown in the Apply modal and on the job cards.
    const breakdown = matchBreakdown(student, job);
    const matchScore = breakdown.matchScore;

    const application = await prisma.application.create({
      data: {
        jobId,
        studentId: student.id,
        coverLetter: coverLetter?.trim() ? String(coverLetter).trim() : null,
        resumeUrl: student.resumeUrl,
        matchScore,
        status: 'APPLIED',
      },
      include: {
        job: { include: { employer: { select: EMPLOYER_PUBLIC_SELECT } } },
        student: { include: { user: { select: { name: true, email: true } } } },
      },
    });

    // ── Side effects: none of these may fail the request ────────────────────
    await prisma.job.update({
      where: { id: jobId },
      data: { applicantCount: { increment: 1 } },
    });

    await prisma.notification.create({
      data: {
        userId: job.employer.userId,
        type: 'NEW_APPLICATION',
        message: `${application.student.user.name} applied for ${job.title} (match ${matchScore}%)`,
        link: `/employer/applications/${application.id}`,
      },
    });

    await prisma.notification.create({
      data: {
        userId,
        type: 'APPLICATION_STATUS_UPDATE',
        message: `Application submitted for ${job.title} at ${job.employer.companyName}`,
        link: `/dashboard/applications/${application.id}`,
      },
    });

    const employerEmail = job.employer.email || job.employer.user?.email || null;
    void sendApplicationReceivedEmail(
      application.student.user.email,
      application.student.user.name,
      job.title,
      job.employer.companyName,
      matchScore
    );
    if (employerEmail) {
      void sendNewApplicationEmail(
        employerEmail,
        job.employer.companyName,
        application.student.user.name,
        job.title,
        matchScore,
        application.id
      );
    }

    // Real-time ping: the employer's pipeline/list and notification bell listen
    // for this event and invalidate their React Query caches.
    emitToUser(job.employer.userId, 'new_application', {
      applicationId: application.id,
      jobId: job.id,
      jobTitle: job.title,
      studentName: application.student.user.name,
      matchScore,
    });

    return responses.created(res, 'Application submitted', {
      id: application.id,
      jobId: application.jobId,
      studentId: application.studentId,
      status: application.status,
      matchScore: application.matchScore,
      appliedAt: application.createdAt,
      coverLetter: application.coverLetter,
      resumeUrl: application.resumeUrl,
      matchBreakdown: breakdown,
      job: {
        id: job.id,
        title: job.title,
        companyName: job.employer.companyName,
        location: job.location,
      },
    });

  } catch (error) {
    next(error);
  }
}


/**
 * GET /api/applications  (alias: /api/applications/my)
 * All applications of the signed-in student.
 * Query: status, jobId, sort (newest|oldest|match), page, limit
 */
export async function getMyApplications(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    if (!userId) {
      return responses.unauthorized(res);
    }

    const statusParam = readParam(req.query.status).toUpperCase();
    const jobId = readParam(req.query.jobId);
    const sort = readParam(req.query.sort) || 'newest';
    const pageNum = Math.max(1, parseInt(readParam(req.query.page)) || 1);
    const pageSize = Math.max(1, Math.min(50, parseInt(readParam(req.query.limit)) || 20));

    const student = await prisma.studentProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!student) {
      return responses.notFound(res, 'Student profile not found');
    }

    const where: any = { studentId: student.id };
    if (isApplicationStatus(statusParam)) where.status = statusParam;
    if (jobId) where.jobId = jobId;

    const orderBy: any =
      sort === 'oldest'
        ? { createdAt: 'asc' }
        : sort === 'match'
          ? { matchScore: 'desc' }
          : { createdAt: 'desc' };

    const [rows, total, grouped, aggregate] = await Promise.all([
      prisma.application.findMany({
        where,
        orderBy,
        skip: (pageNum - 1) * pageSize,
        take: pageSize,
        include: {
          job: { include: { employer: { select: EMPLOYER_PUBLIC_SELECT } } },
          _count: { select: { messages: true } },
        },
      }),
      prisma.application.count({ where }),
      prisma.application.groupBy({
        by: ['status'],
        where: { studentId: student.id },
        _count: { _all: true },
      }),
      prisma.application.aggregate({
        where: { studentId: student.id },
        _avg: { matchScore: true },
      }),
    ]);

    const counts = emptyStatusCounts();
    let all = 0;
    for (const row of grouped) {
      counts[row.status] = row._count._all;
      all += row._count._all;
    }

    return responses.ok(res, 'Applications retrieved', {
      data: rows.map((row) => ({ ...row, appliedAt: row.createdAt })),
      stats: {
        ...counts,
        total: all,
        avgMatchScore: Math.round(aggregate._avg.matchScore ?? 0),
        pending: counts.APPLIED + counts.REVIEWED,
        shortlisted: counts.SHORTLISTED,
        interviewed: counts.INTERVIEWED,
        hired: counts.HIRED,
        rejected: counts.REJECTED,
        withdrawn: counts.WITHDRAWN,
      },
      pagination: buildPagination(total, pageNum, pageSize),
    });
  } catch (error) {
    next(error);
  }
}


/**
 * GET /api/applications/stats
 * Status counts for the student dashboard cards.
 */
export async function getApplicationStats(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    if (!userId) {
      return responses.unauthorized(res);
    }

    const student = await prisma.studentProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!student) {
      return responses.notFound(res, 'Student profile not found');
    }

    const [grouped, aggregate] = await Promise.all([
      prisma.application.groupBy({
        by: ['status'],
        where: { studentId: student.id },
        _count: { _all: true },
      }),
      prisma.application.aggregate({
        where: { studentId: student.id },
        _avg: { matchScore: true },
      }),
    ]);

    const counts = emptyStatusCounts();
    let total = 0;
    for (const row of grouped) {
      counts[row.status] = row._count._all;
      total += row._count._all;
    }

    return responses.ok(res, 'Application stats', {
      ...counts,
      total,
      avgMatchScore: Math.round(aggregate._avg.matchScore ?? 0),
      pending: counts.APPLIED + counts.REVIEWED,
      shortlisted: counts.SHORTLISTED,
      interviewed: counts.INTERVIEWED,
      hired: counts.HIRED,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/applications/job/:jobId
 * Applications for one of the employer's jobs.
 */
export async function getJobApplications(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    if (!userId) {
      return responses.unauthorized(res);
    }

    const jobIdStr = readParam(req.params.jobId);
    const statusParam = readParam(req.query.status).toUpperCase();
    const pageNum = Math.max(1, parseInt(readParam(req.query.page)) || 1);
    const pageSize = Math.max(1, Math.min(100, parseInt(readParam(req.query.limit)) || 50));

    const job = await prisma.job.findUnique({
      where: { id: jobIdStr },
      include: { employer: { select: { userId: true } } },
    });

    if (!job) {
      return responses.notFound(res, 'Job not found');
    }

    if (job.employer.userId !== userId) {
      return responses.forbidden(res);
    }

    const where: any = { jobId: jobIdStr };
    if (isApplicationStatus(statusParam)) where.status = statusParam;

    const [rows, total, grouped] = await Promise.all([
      prisma.application.findMany({
        where,
        orderBy: { matchScore: 'desc' },
        skip: (pageNum - 1) * pageSize,
        take: pageSize,
        include: {
          student: {
            select: { ...STUDENT_PUBLIC_SELECT, user: { select: { name: true, email: true } } },
          },
          _count: { select: { messages: true } },
        },
      }),
      prisma.application.count({ where }),
      prisma.application.groupBy({
        by: ['status'],
        where: { jobId: jobIdStr },
        _count: { _all: true },
      }),
    ]);

    const counts = emptyStatusCounts();
    for (const row of grouped) counts[row.status] = row._count._all;

    return responses.ok(res, 'Job applications retrieved', {
      data: rows.map((row) => ({ ...row, appliedAt: row.createdAt })),
      stats: counts,
      pagination: buildPagination(total, pageNum, pageSize),
    });
  } catch (error) {
    next(error);
  }
}



/**
 * PATCH /api/applications/:id/status
 * (also mounted as PATCH /api/employer/applications/:id/status)
 * Employer-only status change: pipeline rules, email, notification, socket.
 */
export async function updateApplicationStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    const idStr = readParam(req.params.id);
    const { status, notes } = req.body;

    if (!userId) {
      return responses.unauthorized(res);
    }

    if (!status) {
      return responses.badRequest(res, 'Status required');
    }

    if (!isApplicationStatus(status)) {
      return responses.badRequest(res, `Invalid status. Allowed: ${APPLICATION_STATUSES.join(', ')}`);
    }

    const application = await prisma.application.findUnique({
      where: { id: idStr },
      include: {
        job: { include: { employer: { select: { userId: true, companyName: true } } } },
        student: { include: { user: { select: { email: true, name: true } } } },
      },
    });

    if (!application) {
      return responses.notFound(res, 'Application not found');
    }

    if (application.job.employer.userId !== userId) {
      return responses.forbidden(res, 'You can only manage applications for your own jobs');
    }

    const transitionError = validateStatusTransition(
      application.status as ApplicationStatusValue,
      status
    );
    if (transitionError) {
      return responses.badRequest(res, transitionError);
    }

    const updated = await prisma.application.update({
      where: { id: idStr },
      data: {
        status,
        ...(notes !== undefined ? { notes } : {}),
        // First move out of APPLIED is what the timeline shows as "Reviewed".
        ...(application.reviewedAt === null && status !== 'APPLIED'
          ? { reviewedAt: new Date() }
          : {}),
      },
      include: {
        job: { select: { id: true, title: true } },
        student: { select: { id: true } },
      },
    });

    // ── Side effects ────────────────────────────────────────────────────────
    void sendApplicationStatusEmail(
      application.student.user.email,
      application.student.user.name,
      application.job.title,
      application.job.employer.companyName,
      status
    );

    await prisma.notification.create({
      data: {
        userId: application.student.userId,
        type: 'APPLICATION_STATUS_UPDATE',
        message: `Your application for ${application.job.title} is now ${status}`,
        link: `/dashboard/applications/${application.id}`,
      },
    });

    // Student side: dashboard / list / detail caches refresh.
    emitToUser(application.student.userId, 'application_status_changed', {
      applicationId: application.id,
      jobId: application.jobId,
      jobTitle: application.job.title,
      status,
      companyName: application.job.employer.companyName,
    });

    // Employer side: keep a second open tab (kanban / list) in sync.
    emitToUser(application.job.employer.userId, 'application_status_changed', {
      applicationId: application.id,
      jobId: application.jobId,
      status,
      studentName: application.student.user.name,
    });

    return responses.ok(res, 'Status updated', { ...updated, appliedAt: updated.createdAt });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/applications/:id/withdraw  (alias: DELETE /api/applications/:id)
 * Student withdraws their own application.
 */
export async function withdrawApplication(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    const idStr = readParam(req.params.id);

    if (!userId) {
      return responses.unauthorized(res);
    }

    const application = await prisma.application.findUnique({
      where: { id: idStr },
      include: {
        student: { select: { userId: true } },
        job: {
          select: {
            id: true,
            title: true,
            applicantCount: true,
            employer: { select: { userId: true } },
          },
        },
      },
    });

    if (!application) {
      return responses.notFound(res, 'Application not found');
    }

    if (application.student.userId !== userId) {
      return responses.forbidden(res);
    }

    if (TERMINAL_STATUSES.includes(application.status as ApplicationStatusValue)) {
      return responses.badRequest(
        res,
        `A ${application.status.toLowerCase()} application can no longer be withdrawn`
      );
    }

    const updated = await prisma.application.update({
      where: { id: idStr },
      data: { status: 'WITHDRAWN' },
    });

    // Mirror the increment done on create — clamped at zero.
    if (application.job.applicantCount > 0) {
      await prisma.job.update({
        where: { id: application.jobId },
        data: { applicantCount: { decrement: 1 } },
      });
    }

    await prisma.notification.create({
      data: {
        userId: application.job.employer.userId,
        type: 'APPLICATION_STATUS_UPDATE',
        message: `An applicant withdrew from ${application.job.title}`,
        link: `/employer/applications/${idStr}`,
      },
    });

    emitToUser(application.job.employer.userId, 'application_status_changed', {
      applicationId: idStr,
      jobId: application.jobId,
      status: 'WITHDRAWN',
    });

    return responses.ok(res, 'Application withdrawn', {
      ...updated,
      appliedAt: updated.createdAt,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/applications/:id/notes
 * Employer keeps private notes on a candidate.
 */
export async function updateApplicationNotes(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    const idStr = readParam(req.params.id);
    const { notes } = req.body;

    if (!userId) {
      return responses.unauthorized(res);
    }

    const application = await prisma.application.findUnique({
      where: { id: idStr },
      include: { job: { include: { employer: { select: { userId: true } } } } },
    });

    if (!application) {
      return responses.notFound(res, 'Application not found');
    }

    if (application.job.employer.userId !== userId) {
      return responses.forbidden(res, 'You can only manage applications for your own jobs');
    }

    const updated = await prisma.application.update({
      where: { id: idStr },
      data: { notes },
    });

    return responses.ok(res, 'Notes updated', updated);
  } catch (error) {
    next(error);
  }
}


/**
 * GET /api/applications/:id
 * Full detail for the student who applied or the employer who owns the job:
 * job + company, student profile, cover letter + resume, match breakdown,
 * status timeline and the message thread.
 */
export async function getApplicationDetail(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    if (!userId) {
      return responses.unauthorized(res);
    }

    const idStr = readParam(req.params.id);

    const application = await prisma.application.findUnique({
      where: { id: idStr },
      include: {
        job: {
          include: {
            employer: {
              select: {
                id: true,
                userId: true,
                companyName: true,
                logoUrl: true,
                isVerified: true,
                location: true,
                website: true,
              },
            },
          },
        },
        student: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                role: true,
                studentProfile: { select: { photoUrl: true } },
              },
            },
          },
        },
      },
    });

    if (!application) {
      return responses.notFound(res, 'Application not found');
    }

    const isStudent = application.student.userId === userId;
    const isEmployer = application.job.employer.userId === userId;

    if (!isStudent && !isEmployer) {
      return responses.forbidden(res, 'You do not have access to this application');
    }

    // Opening the thread marks the other party's messages as read.
    await prisma.message.updateMany({
      where: { applicationId: idStr, senderId: { not: userId }, isRead: false },
      data: { isRead: true },
    });

    // Employer notes are private — never expose them to the student.
    const { notes, ...shared } = application;

    return responses.ok(res, 'Application detail', {
      ...shared,
      ...(isEmployer ? { notes } : {}),
      appliedAt: application.createdAt,
      matchBreakdown: matchBreakdown(application.student, application.job),
      timeline: buildApplicationTimeline(application),
      viewer: isEmployer ? 'EMPLOYER' : 'STUDENT',
      // Pipeline moves the viewer is allowed to make from the current status.
      allowedTransitions: isEmployer
        ? PIPELINE_TRANSITIONS[application.status as ApplicationStatusValue] ?? []
        : [],
    });
  } catch (error) {
    next(error);
  }
}
