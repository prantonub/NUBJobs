import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { responses } from '../utils/response.utils';
import { calculateMatchScore } from '../services/ai.service';
import { sendApplicationStatusEmail } from '../services/email.service';

export interface AuthRequest extends Request {
  userId?: string;
  email?: string;
  role?: string;
}

/**
 * POST /api/applications
 * Create new application with validations
 */
export async function createApplication(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    const { jobId, coverLetter } = req.body;

    if (!userId) {
      return responses.unauthorized(res);
    }

    // Get student
    const student = await prisma.studentProfile.findUnique({
      where: { userId },
      include: { user: { select: { email: true, name: true } } },
    });

    if (!student) {
      return responses.notFound(res, 'Student profile not found');
    }

    // Get job
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { employer: true },
    });

    if (!job) {
      return responses.notFound(res, 'Job not found');
    }

    // Check 1: Job is active
    if (job.status !== 'ACTIVE') {
      return responses.badRequest(res, 'Job is not active');
    }

    // Check 2: Duplicate application
    const existing = await prisma.application.findUnique({
      where: {
        jobId_studentId: { jobId, studentId: student.id },
      },
    });

    if (existing) {
      return responses.conflict(res, 'Already applied for this job');
    }

    // Check 3: CGPA requirement
    if (job.minCgpa && (!student.cgpa || student.cgpa < job.minCgpa)) {
      return responses.badRequest(res, `Minimum CGPA required: ${job.minCgpa}`);
    }

    // Check 4: Deadline
    if (job.deadline && new Date() > job.deadline) {
      return responses.badRequest(res, 'Application deadline has passed');
    }

    // Check 5: University targeting
    if (job.targetUniversity === 'NUB') {
      const nubStudent = await prisma.studentProfile.findUnique({
        where: { id: student.id },
        select: { nubId: true },
      });
      if (!nubStudent?.nubId) {
        return responses.badRequest(res, 'This job is only for NUB students');
      }
    }

    // Calculate match score
    const matchScore = await calculateMatchScore(jobId, student.id);

    // Create application
    const application = await prisma.application.create({
      data: {
        jobId,
        studentId: student.id,
        coverLetter,
        matchScore,
        status: 'APPLIED',
      },
      include: {
        job: {
          select: { title: true, employer: { select: { companyName: true } } },
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
        message: `${student.user.name} applied for ${job.title}`,
        link: `/employer/applications/${application.id}`,
      },
    });

    // Send email to employer
    // (implementation would use email service)

    return responses.created(res, 'Application submitted', application);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/applications/my
 * Get current student's applications
 */
export async function getMyApplications(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    const { status, page = 1, limit = 10 } = req.query;

    if (!userId) {
      return responses.unauthorized(res);
    }

    const student = await prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (!student) {
      return responses.notFound(res, 'Student not found');
    }

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const pageSize = Math.max(1, Math.min(50, parseInt(limit as string) || 10));
    const skip = (pageNum - 1) * pageSize;

    const where: any = { studentId: student.id };
    if (status && status !== 'all') {
      where.status = status;
    }

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        include: {
          job: {
            include: {
              employer: {
                select: { companyName: true, logoUrl: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.application.count({ where }),
    ]);

    return responses.ok(res, 'Your applications', {
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
 * Get all applications for a job (employer only)
 */
export async function getJobApplications(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { jobId } = req.params;
    const userId = req.userId;
    const { status, page = 1, limit = 10 } = req.query;

    if (!userId || req.role !== 'EMPLOYER') {
      return responses.forbidden(res);
    }

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { employer: true },
    });

    if (!job) {
      return responses.notFound(res, 'Job not found');
    }

    if (job.employer.userId !== userId) {
      return responses.forbidden(res);
    }

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const pageSize = Math.max(1, Math.min(50, parseInt(limit as string) || 10));
    const skip = (pageNum - 1) * pageSize;

    const where: any = { jobId };
    if (status && status !== 'all') {
      where.status = status;
    }

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        include: {
          student: {
            select: {
              id: true,
              user: {
                select: { name: true, email: true },
              },
              cgpa: true,
              skills: true,
              photoUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.application.count({ where }),
    ]);

    return responses.ok(res, 'Job applications', {
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
 * PATCH /api/applications/:id/status
 * Update application status (employer only) with email notification
 */
export async function updateApplicationStatus(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const userId = req.userId;

    if (!userId || req.role !== 'EMPLOYER') {
      return responses.forbidden(res);
    }

    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        job: { include: { employer: true } },
        student: { include: { user: { select: { email: true, name: true } } } },
      },
    });

    if (!application) {
      return responses.notFound(res, 'Application not found');
    }

    if (application.job.employer.userId !== userId) {
      return responses.forbidden(res);
    }

    const updated = await prisma.application.update({
      where: { id },
      data: {
        status,
        notes: notes || application.notes,
      },
      include: { job: true, student: true },
    });

    // Send email notification to student
    if (application.student.user.email) {
      await sendApplicationStatusEmail(
        application.student.user.email,
        application.student.user.name,
        application.job.title,
        application.job.employer.companyName,
        status
      );
    }

    // Create notification
    await prisma.notification.create({
      data: {
        userId: application.student.userId,
        type: 'APPLICATION_STATUS_UPDATE',
        message: `Your application for ${application.job.title} status changed to ${status}`,
        link: `/applications/${id}`,
      },
    });

    return responses.ok(res, 'Status updated', updated);
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/applications/:id
 * Withdraw application (student only, APPLIED status only)
 */
export async function withdrawApplication(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!userId) {
      return responses.unauthorized(res);
    }

    const application = await prisma.application.findUnique({
      where: { id },
      include: { student: true, job: true },
    });

    if (!application) {
      return responses.notFound(res, 'Application not found');
    }

    if (application.student.userId !== userId) {
      return responses.forbidden(res);
    }

    if (application.status !== 'APPLIED') {
      return responses.badRequest(res, 'Only APPLIED applications can be withdrawn');
    }

    const updated = await prisma.application.update({
      where: { id },
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
 * PATCH /api/applications/:id/notes
 * Update notes (employer only)
 */
export async function updateApplicationNotes(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const userId = req.userId;

    if (!userId || req.role !== 'EMPLOYER') {
      return responses.forbidden(res);
    }

    const application = await prisma.application.findUnique({
      where: { id },
      include: { job: { include: { employer: true } } },
    });

    if (!application) {
      return responses.notFound(res, 'Application not found');
    }

    if (application.job.employer.userId !== userId) {
      return responses.forbidden(res);
    }

    const updated = await prisma.application.update({
      where: { id },
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

    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        job: { include: { employer: true } },
        student: { include: { user: { select: { name: true, email: true } } } },
        messages: {
          include: {
            sender: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!application) {
      return responses.notFound(res, 'Application not found');
    }

    // Check access
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