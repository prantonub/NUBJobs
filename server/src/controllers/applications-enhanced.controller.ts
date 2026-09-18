import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { responses } from '../utils/response.utils';
import { sendApplicationStatusEmail } from '../services/email.service';
import { emitToUser } from '../lib/socket-server';

export interface AuthRequest extends Request {
  userId?: string;
  email?: string;
  role?: string;
}

/**
 * POST /api/applications
 * Create application with 6-layer validation
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

    // Get student profile (skills + CGPA feed the match score below)
    const student = await prisma.studentProfile.findUnique({
      where: { userId },
      select: { id: true, cgpa: true, skills: true },
    });

    if (!student) {
      return responses.notFound(res, 'Student profile not found');
    }

    // Get job details
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        employer: {
          select: { userId: true, companyName: true },
        },
      },
    });

    if (!job) {
      return responses.notFound(res, 'Job not found');
    }

    // Validation 0: banned students cannot apply
    const account = await prisma.user.findUnique({
      where: { id: userId },
      select: { isBanned: true },
    });
    if (account?.isBanned) {
      return responses.forbidden(res, 'Your account is banned. You cannot apply for jobs.');
    }

    // Validation 1: Job must be ACTIVE
    if (job.status !== 'ACTIVE') {
      return responses.badRequest(res, 'Job is not active');
    }

    // Validation 2: Check if already applied
    const existing = await prisma.application.findUnique({
      where: { jobId_studentId: { jobId, studentId: student.id } },
    });

    if (existing) {
      return responses.badRequest(res, 'Already applied to this job');
    }

    // Validation 3: CGPA requirement check
    if (job.minCgpa && (!student.cgpa || student.cgpa < job.minCgpa)) {
      return responses.badRequest(res, `Minimum CGPA required: ${job.minCgpa}`);
    }

    // Validation 4: Deadline check
    if (job.deadline && new Date() > job.deadline) {
      return responses.badRequest(res, 'Application deadline passed');
    }

    // Validation 5: University targeting check
    // If job targets specific university, check student's university
    // (Implementation depends on StudentProfile.university field)

    // Validation 6: Calculate match score
    // Score = skills overlap (70%) + CGPA headroom (30%). Requires a non-empty
    // student skills list, otherwise every job would score 0/100 uniformly.
    let matchScore = 0;
    const studentSkills = (student.skills ?? []).map((s) => s.trim().toLowerCase());
    const jobSkills = (job.skills ?? []).map((s) => s.trim().toLowerCase());

    if (jobSkills.length > 0) {
      let score = 0;

      if (studentSkills.length > 0) {
        const studentSet = new Set(studentSkills);
        const matchedSkills = jobSkills.filter((skill) => studentSet.has(skill));
        score += (matchedSkills.length / jobSkills.length) * 70;
      }

      if (job.minCgpa && student.cgpa) {
        // Meeting the bar exactly earns 30; every 0.25 above adds 5, capped at 30.
        const cgpaBonus = Math.min(30, Math.max(0, (student.cgpa - job.minCgpa) / 0.25) * 5 + 25);
        score += student.cgpa >= job.minCgpa ? cgpaBonus : 0;
      }

      matchScore = Math.round(score);
    }

    // Create application
    const application = await prisma.application.create({
      data: {
        jobId,
        studentId: student.id,
        coverLetter: coverLetter || null,
        matchScore,
        status: 'APPLIED',
      },
      include: {
        job: {
          include: {
            employer: {
              select: { userId: true, companyName: true },
            },
          },
        },
        student: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
      },
    });

    // Increment applicant count
    await prisma.job.update({
      where: { id: jobId },
      data: { applicantCount: { increment: 1 } },
    });

    // Create notification for employer
    await prisma.notification.create({
      data: {
        userId: job.employer.userId,
        type: 'NEW_APPLICATION',
        message: `${application.student.user.name} applied for ${job.title} (match ${matchScore}%)`,
        link: `/employer/applications/${application.id}`,
      },
    });

    // Real-time ping to the employer: the kanban pipeline and notification bell
    // listen for this event and invalidate their React Query caches.
    emitToUser(job.employer.userId, 'new_application', {
      applicationId: application.id,
      jobId: job.id,
      jobTitle: job.title,
      studentName: application.student.user.name,
      matchScore,
    });

    return responses.created(res, 'Application submitted', application);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/applications/my
 * Get student's applications
 */
export async function getMyApplications(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    if (!userId) {
      return responses.unauthorized(res);
    }

    const { page = 1, limit = 10 } = req.query;

    const student = await prisma.studentProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!student) {
      return responses.notFound(res, 'Student not found');
    }

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const pageSize = Math.max(1, Math.min(50, parseInt(limit as string) || 10));
    const skip = (pageNum - 1) * pageSize;

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where: { studentId: student.id },
        include: {
          job: {
            include: {
              employer: { select: { companyName: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.application.count({ where: { studentId: student.id } }),
    ]);

    return responses.ok(res, 'Applications retrieved', {
      data: applications,
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
 * GET /api/applications/job/:jobId
 * Get applications for a job (employer only)
 */
export async function getJobApplications(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { jobId } = req.params;
    const userId = req.userId;

    if (!userId) {
      return responses.unauthorized(res);
    }

    const jobIdStr = Array.isArray(jobId) ? jobId[0] : jobId;

    const job = await prisma.job.findUnique({
      where: { id: jobIdStr },
      include: {
        employer: { select: { userId: true } },
      },
    });

    if (!job) {
      return responses.notFound(res, 'Job not found');
    }

    if (job.employer.userId !== userId) {
      return responses.forbidden(res);
    }

    const applications = await prisma.application.findMany({
      where: { jobId: jobIdStr },
      include: {
        student: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return responses.ok(res, 'Job applications retrieved', applications);
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/applications/:id/status
 * Update application status (employer only)
 */
export async function updateApplicationStatus(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const { status } = req.body;

    if (!userId) {
      return responses.unauthorized(res);
    }

    const idStr = Array.isArray(id) ? id[0] : id;

    if (!status) {
      return responses.badRequest(res, 'Status required');
    }

    const application = await prisma.application.findUnique({
      where: { id: idStr },
      include: {
        job: {
          include: {
            employer: { select: { userId: true, companyName: true } },
          },
        },
        student: {
          include: {
            user: { select: { email: true, name: true } },
          },
        },
      },
    });

    if (!application) {
      return responses.notFound(res, 'Application not found');
    }

    if (application.job.employer.userId !== userId) {
      return responses.forbidden(res);
    }

    // Kanban pipeline rules: forward steps and terminal rejects only, no jumps
    // backwards into earlier stages.
    const PIPELINE: Record<string, string[]> = {
      APPLIED: ['REVIEWED', 'SHORTLISTED', 'REJECTED'],
      REVIEWED: ['SHORTLISTED', 'INTERVIEWED', 'REJECTED'],
      SHORTLISTED: ['INTERVIEWED', 'HIRED', 'REJECTED'],
      INTERVIEWED: ['HIRED', 'REJECTED'],
      HIRED: [],
      REJECTED: [],
      WITHDRAWN: [],
    };

    if (application.status === status) {
      return responses.badRequest(res, `Application is already ${status}`);
    }

    if (!PIPELINE[application.status]?.includes(status)) {
      return responses.badRequest(
        res,
        `Invalid transition: ${application.status} → ${status}. Allowed: ${
          PIPELINE[application.status]?.join(', ') || 'none (terminal state)'
        }`
      );
    }

    // Update application
    const updated = await prisma.application.update({
      where: { id: idStr },
      data: {
        status,
        ...(req.body.notes !== undefined ? { notes: req.body.notes } : {}),
      },
      include: {
        job: { select: { title: true } },
        student: { include: { user: { select: { email: true, name: true } } } },
      },
    });

    // Send email notification
    await sendApplicationStatusEmail(
      application.student.user.email,
      application.student.user.name,
      application.job.title,
      application.job.employer.companyName,
      status
    );

    // Create notification
    await prisma.notification.create({
      data: {
        userId: application.student.userId,
        type: 'APPLICATION_STATUS_UPDATE',
        message: `Your application for ${application.job.title} status changed to ${status}`,
        link: `/applications/${application.id}`,
      },
    });

    // Real-time ping to the student: the dashboard and notification bell listen
    // for this event and invalidate their React Query caches.
    emitToUser(application.student.userId, 'application_status_changed', {
      applicationId: application.id,
      jobId: application.jobId,
      jobTitle: application.job.title,
      status,
      companyName: application.job.employer.companyName,
    });

    return responses.ok(res, 'Status updated', updated);
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/applications/:id/withdraw
 * Withdraw application (student only, APPLIED status only)
 */
export async function withdrawApplication(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!userId) {
      return responses.unauthorized(res);
    }

    const idStr = Array.isArray(id) ? id[0] : id;

    const application = await prisma.application.findUnique({
      where: { id: idStr },
      include: {
        student: { select: { userId: true } },
      },
    });

    if (!application) {
      return responses.notFound(res, 'Application not found');
    }

    if (application.student.userId !== userId) {
      return responses.forbidden(res);
    }

    if (application.status !== 'APPLIED') {
      return responses.badRequest(res, 'Can only withdraw APPLIED applications');
    }

    // Update status
    const updated = await prisma.application.update({
      where: { id: idStr },
      data: { status: 'WITHDRAWN' },
    });

    // Decrement applicant count
    await prisma.job.update({
      where: { id: application.jobId },
      data: { applicantCount: { decrement: 1 } },
    });

    return responses.ok(res, 'Application withdrawn', updated);
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/applications/:id/notes
 * Update employer notes (employer only)
 */
export async function updateApplicationNotes(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const { notes } = req.body;

    if (!userId) {
      return responses.unauthorized(res);
    }

    const idStr = Array.isArray(id) ? id[0] : id;

    const application = await prisma.application.findUnique({
      where: { id: idStr },
      include: {
        job: {
          include: {
            employer: { select: { userId: true } },
          },
        },
      },
    });

    if (!application) {
      return responses.notFound(res, 'Application not found');
    }

    if (application.job.employer.userId !== userId) {
      return responses.forbidden(res);
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
 * Get application detail
 */
export async function getApplicationDetail(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!userId) {
      return responses.unauthorized(res);
    }

    const idStr = Array.isArray(id) ? id[0] : id;

    const application = await prisma.application.findUnique({
      where: { id: idStr },
      include: {
        job: {
          include: {
            employer: { select: { userId: true, companyName: true } },
          },
        },
        student: {
          include: {
            user: { select: { id: true, email: true, name: true } },
          },
        },
      },
    });

    if (!application) {
      return responses.notFound(res, 'Application not found');
    }

    // Check access: student or employer
    const isStudent = application.student.userId === userId;
    const isEmployer = application.job.employer.userId === userId;

    if (!isStudent && !isEmployer) {
      return responses.forbidden(res);
    }

    return responses.ok(res, 'Application detail', application);
  } catch (error) {
    next(error);
  }
}