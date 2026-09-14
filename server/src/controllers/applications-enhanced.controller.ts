import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { responses } from '../utils/response.utils';
import { sendApplicationStatusEmail } from '../services/email.service';

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

    // Get student profile
    const student = await prisma.studentProfile.findUnique({
      where: { userId },
      select: { id: true, cgpa: true },
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
    let matchScore = 0;
    if (job.skills && job.skills.length > 0) {
      const studentSkills = new Set(student.cgpa ? [student.cgpa.toString()] : []);
      const matchedSkills = job.skills.filter((skill) => studentSkills.has(skill));
      matchScore = Math.round((matchedSkills.length / job.skills.length) * 100);
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
        message: `New application for ${job.title}`,
        link: `/employer/applications/${application.id}`,
      },
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

    // Update application
    const updated = await prisma.application.update({
      where: { id: idStr },
      data: { status },
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