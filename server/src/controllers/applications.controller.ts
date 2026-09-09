import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { calculateMatchScore } from '../services/ai.service';

/**
 * GET /api/applications
 * Get all applications for current student with optional status filter
 */
export const getApplications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { status, page = 1, limit = 10 } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const student = await prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const where: any = { studentId: student.id };
    if (status && status !== 'all') {
      where.status = status;
    }

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const pageSize = Math.max(1, Math.min(50, parseInt(limit as string) || 10));
    const skip = (pageNum - 1) * pageSize;

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        include: {
          job: {
            include: {
              employer: {
                select: {
                  companyName: true,
                  logoUrl: true,
                },
              },
            },
          },
          messages: {
            select: {
              id: true,
              createdAt: true,
            },
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.application.count({ where }),
    ]);

    res.json({
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
};

/**
 * GET /api/applications/:id
 * Get single application with messages
 */
export const getApplicationDetail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = (req as any).userId;

    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        job: {
          include: {
            employer: {
              select: {
                id: true,
                companyName: true,
                logoUrl: true,
                website: true,
                about: true,
              },
            },
          },
        },
        student: true,
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: { id: true, name: true, email: true },
            },
            receiver: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Check authorization
    if (userId && application.student?.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    res.json({ data: application });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/applications
 * Create a new application
 */
export const createApplication = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { jobId, coverLetter } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!jobId) {
      return res.status(400).json({ error: 'jobId is required' });
    }

    // Get student profile
    const student = await prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    // Check if job exists
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Check if already applied
    const existing = await prisma.application.findUnique({
      where: {
        jobId_studentId: {
          jobId,
          studentId: student.id,
        },
      },
    });

    if (existing) {
      return res.status(409).json({ error: 'Already applied for this job' });
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
          include: {
            employer: {
              select: {
                companyName: true,
              },
            },
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
    const employer = await prisma.employerProfile.findUnique({
      where: { id: job.employerId },
      select: { userId: true },
    });

    if (employer) {
      await prisma.notification.create({
        data: {
          userId: employer.userId,
          type: 'NEW_APPLICATION',
          message: `New application received for ${job.title}`,
          link: `/applications/${application.id}`,
        },
      });
    }

    res.status(201).json({ data: application, message: 'Application submitted' });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Already applied for this job' });
    }
    next(error);
  }
};

/**
 * PATCH /api/applications/:id
 * Update application (employer: update status/notes; student: update coverLetter)
 */
export const updateApplication = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = (req as any).userId;
    const { status, notes, coverLetter } = req.body;

    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        job: { include: { employer: true } },
        student: true,
      },
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Check authorization: employer can update status/notes, student can update coverLetter
    const isEmployer = userId === application.job.employer?.userId;
    const isStudent = userId === application.student?.userId;

    if (!isEmployer && !isStudent) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const data: any = {};

    if (isEmployer && status) {
      data.status = status;
      data.notes = notes || application.notes;
    }

    if (isStudent && coverLetter) {
      data.coverLetter = coverLetter;
    }

    const updated = await prisma.application.update({
      where: { id },
      data,
      include: {
        job: { include: { employer: true } },
        student: true,
      },
    });

    // Send notification if status changed
    if (status && isEmployer) {
      await prisma.notification.create({
        data: {
          userId: application.student.userId,
          type: 'APPLICATION_STATUS_UPDATE',
          message: `Your application for ${application.job.title} is now ${status}`,
          link: `/applications/${id}`,
        },
      });
    }

    res.json({ data: updated, message: 'Application updated' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/applications/:id/withdraw
 * Withdraw an application (soft delete - change status to WITHDRAWN)
 */
export const withdrawApplication = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = (req as any).userId;

    const application = await prisma.application.findUnique({
      where: { id },
      include: { student: true },
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Check authorization
    if (userId !== application.student?.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Note: We update status to a special value or use soft delete
    // For now, we'll use a flag. Can extend schema if needed.
    const updated = await prisma.application.update({
      where: { id },
      data: {
        status: 'REJECTED', // Mark as withdrawn
        notes: 'Withdrawn by student',
      },
    });

    res.json({ data: updated, message: 'Application withdrawn' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/applications/:id/match-score
 * Get match score for an application
 */
export const getApplicationMatchScore = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const application = await prisma.application.findUnique({
      where: { id },
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json({
      data: {
        matchScore: application.matchScore || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/applications/stats
 * Get application statistics for dashboard
 */
export const getApplicationStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const student = await prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const [
      total,
      applied,
      reviewed,
      shortlisted,
      interviewed,
      hired,
      rejected,
      avgMatchScore,
    ] = await Promise.all([
      prisma.application.count({ where: { studentId: student.id } }),
      prisma.application.count({
        where: { studentId: student.id, status: 'APPLIED' },
      }),
      prisma.application.count({
        where: { studentId: student.id, status: 'REVIEWED' },
      }),
      prisma.application.count({
        where: { studentId: student.id, status: 'SHORTLISTED' },
      }),
      prisma.application.count({
        where: { studentId: student.id, status: 'INTERVIEWED' },
      }),
      prisma.application.count({
        where: { studentId: student.id, status: 'HIRED' },
      }),
      prisma.application.count({
        where: { studentId: student.id, status: 'REJECTED' },
      }),
      prisma.application.aggregate({
        where: { studentId: student.id },
        _avg: { matchScore: true },
      }),
    ]);

    res.json({
      data: {
        total,
        applied,
        reviewed,
        shortlisted,
        interviewed,
        hired,
        rejected,
        avgMatchScore: avgMatchScore._avg.matchScore || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};