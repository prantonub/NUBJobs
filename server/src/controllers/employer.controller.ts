import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { responses } from '../utils/response.utils';

export interface AuthRequest extends Request {
  userId?: string;
  email?: string;
  role?: string;
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
    const { status = 'ACTIVE', page = 1, limit = 10 } = req.query;

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
    if (status) where.status = status;

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          _count: {
            select: { applications: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.job.count({ where }),
    ]);

    return responses.ok(res, 'Jobs fetched', {
      data: jobs,
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
 * GET /api/employer/applications
 * Get applications for employer's jobs with pipeline view
 */
export async function getEmployerApplications(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    const { jobId } = req.query;

    if (!userId) {
      return responses.unauthorized(res);
    }

    const employer = await prisma.employerProfile.findUnique({
      where: { userId },
    });

    if (!employer) {
      return responses.notFound(res, 'Employer profile not found');
    }

    const where: any = { job: { employerId: employer.id } };
    if (jobId) where.jobId = jobId;

    const applications = await prisma.application.findMany({
      where,
      include: {
        job: {
          select: { id: true, title: true },
        },
        student: {
          select: {
            id: true,
            user: { select: { name: true, email: true } },
            cgpa: true,
            skills: true,
            photoUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group by status (Kanban board)
    const grouped: Record<string, any[]> = {
      APPLIED: [],
      REVIEWED: [],
      SHORTLISTED: [],
      INTERVIEWED: [],
      HIRED: [],
      REJECTED: [],
    };

    applications.forEach((app: any) => {
      if (app.status in grouped) {
        grouped[app.status].push(app);
      }
    });

    return responses.ok(res, 'Applications fetched', grouped);
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
      where: { id },
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

    return responses.ok(res, 'Application fetched', application);
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/employer/applications/:id/status
 * Update application status
 */
export async function updateApplicationStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
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
      where: { id },
      include: { job: true, student: true },
    });

    if (!application) {
      return responses.notFound(res, 'Application not found');
    }

    if (application.job.employerId !== employer.id) {
      return responses.forbidden(res);
    }

    const updated = await prisma.application.update({
      where: { id },
      data: {
        status,
        notes: notes || application.notes,
      },
      include: {
        job: true,
        student: true,
      },
    });

    // Create notification for student
    if (application.student) {
      await prisma.notification.create({
        data: {
          userId: application.student.userId,
          type: 'APPLICATION_STATUS_UPDATE',
          message: `Your application for ${application.job.title} is now ${status}`,
          link: `/applications/${id}`,
        },
      });
    }

    return responses.ok(res, 'Application status updated', updated);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/employer/applications/:id/schedule-interview
 * Schedule interview
 */
export async function scheduleInterview(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
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
      where: { id },
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
      where: { id },
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
        type: 'INTERVIEW_SCHEDULED',
        message: `Interview scheduled for ${application.job.title}`,
        link: `/applications/${id}`,
      },
    });

    return responses.ok(res, 'Interview scheduled', updated);
  } catch (error) {
    next(error);
  }
}