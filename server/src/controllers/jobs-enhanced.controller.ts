import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { responses } from '../utils/response.utils';

export interface AuthRequest extends Request {
  userId?: string | string[];
  email?: string;
  role?: string;
}

/**
 * GET /api/jobs
 * List jobs with advanced filtering and pagination
 */
export async function listJobs(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const {
      search = '',
      category = '',
      type = '',
      location = '',
      salaryMin = 0,
      salaryMax = 999999,
      sort = 'newest',
      page = 1,
      limit = 10,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const pageSize = Math.max(1, Math.min(50, parseInt(limit as string) || 10));
    const skip = (pageNum - 1) * pageSize;

    const where: any = {
      status: 'ACTIVE',
    };

    if (search) {
      where.OR = [{ title: { contains: search as string, mode: 'insensitive' } }];
    }

    if (category) {
      where.category = category;
    }

    if (type) {
      where.type = type;
    }

    if (location) {
      where.location = { contains: location as string, mode: 'insensitive' };
    }

    if (salaryMin || salaryMax) {
      where.salaryMin = { gte: parseInt(salaryMin as string) };
      where.salaryMax = { lte: parseInt(salaryMax as string) };
    }

    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'salary') {
      orderBy = { salaryMax: 'desc' };
    } else if (sort === 'views') {
      orderBy = { views: 'desc' };
    }

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        include: {
          employer: { select: { companyName: true, logoUrl: true } },
        },
        orderBy,
        skip,
        take: pageSize,
      }),
      prisma.job.count({ where }),
    ]);

    return responses.ok(res, 'Jobs retrieved', {
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
 * GET /api/jobs/:id
 * Get single job detail
 */
export async function getJobDetail(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const idStr = Array.isArray(id) ? id[0] : id;

    const job = await prisma.job.findUnique({
      where: { id: idStr },
      include: {
        employer: true,
        applications: { select: { id: true } },
      },
    });

    if (!job) {
      return responses.notFound(res, 'Job not found');
    }

    // Increment views
    await prisma.job.update({
      where: { id: idStr },
      data: { views: { increment: 1 } },
    });

    return responses.ok(res, 'Job detail', job);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/jobs
 * Create job (student only - creates as PENDING for verification)
 */
export async function createJob(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    const userIdStr = Array.isArray(userId) ? userId[0] : userId;

    if (!userIdStr) {
      return responses.unauthorized(res);
    }

    const {
      title,
      description,
      category,
      type,
      location,
      salaryMin,
      salaryMax,
      minCgpa,
      skills,
      deadline,
    } = req.body;

    if (!title || !description) {
      return responses.badRequest(res, 'Title and description required');
    }

    // Check if employer is verified
    const employer = await prisma.employerProfile.findUnique({
      where: { userId: userIdStr },
      select: { id: true, isVerified: true },
    });

    if (!employer) {
      return responses.forbidden(res, 'Employer profile not found');
    }

    const job = await prisma.job.create({
      data: {
        title,
        description,
        category: category || null,
        type: type || 'FULL_TIME',
        location: location || null,
        salaryMin: salaryMin ? parseInt(salaryMin) : null,
        salaryMax: salaryMax ? parseInt(salaryMax) : null,
        minCgpa: minCgpa ? parseFloat(minCgpa) : null,
        skills: skills || [],
        deadline: deadline ? new Date(deadline) : null,
        status: employer.isVerified ? 'ACTIVE' : 'PENDING',
        employerId: employer.id,
      },
    });

    return responses.created(res, 'Job created', job);
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/jobs/:id
 * Update job (draft/pending only)
 */
export async function updateJob(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    const userIdStr = Array.isArray(userId) ? userId[0] : userId;
    const { id } = req.params;
    const idStr = Array.isArray(id) ? id[0] : id;

    if (!userIdStr) {
      return responses.unauthorized(res);
    }

    const job = await prisma.job.findUnique({
      where: { id: idStr },
      include: { employer: { select: { userId: true } } },
    });

    if (!job) {
      return responses.notFound(res, 'Job not found');
    }

    if (job.employer.userId !== userIdStr) {
      return responses.forbidden(res);
    }

    if (!['DRAFT', 'PENDING'].includes(job.status)) {
      return responses.badRequest(res, 'Can only edit draft/pending jobs');
    }

    const updated = await prisma.job.update({
      where: { id: idStr },
      data: req.body,
    });

    return responses.ok(res, 'Job updated', updated);
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/jobs/:id
 * Delete job (draft only)
 */
export async function deleteJob(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    const userIdStr = Array.isArray(userId) ? userId[0] : userId;
    const { id } = req.params;
    const idStr = Array.isArray(id) ? id[0] : id;

    if (!userIdStr) {
      return responses.unauthorized(res);
    }

    const job = await prisma.job.findUnique({
      where: { id: idStr },
      include: { employer: { select: { userId: true } } },
    });

    if (!job) {
      return responses.notFound(res, 'Job not found');
    }

    if (job.employer.userId !== userIdStr) {
      return responses.forbidden(res);
    }

    if (job.status !== 'DRAFT') {
      return responses.badRequest(res, 'Can only delete draft jobs');
    }

    await prisma.job.delete({ where: { id: idStr } });
    return responses.ok(res, 'Job deleted');
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/jobs/my/jobs
 * Get jobs posted by employer
 */
export async function getMyJobs(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    const userIdStr = Array.isArray(userId) ? userId[0] : userId;

    if (!userIdStr) {
      return responses.unauthorized(res);
    }

    const employer = await prisma.employerProfile.findUnique({
      where: { userId: userIdStr },
      select: { id: true },
    });

    if (!employer) {
      return responses.notFound(res, 'Employer not found');
    }

    const jobs = await prisma.job.findMany({
      where: { employerId: employer.id },
      orderBy: { createdAt: 'desc' },
    });

    return responses.ok(res, 'My jobs', jobs);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/jobs/:id/save
 * Save/bookmark a job
 */
export async function toggleSaveJob(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    const userIdStr = Array.isArray(userId) ? userId[0] : userId;
    const { id } = req.params;
    const idStr = Array.isArray(id) ? id[0] : id;

    if (!userIdStr) {
      return responses.unauthorized(res);
    }

    const student = await prisma.studentProfile.findUnique({
      where: { userId: userIdStr },
      select: { id: true },
    });

    if (!student) {
      return responses.notFound(res, 'Student not found');
    }

    const existing = await prisma.savedJob.findUnique({
      where: { studentId_jobId: { studentId: student.id, jobId: idStr } },
    });

    if (existing) {
      await prisma.savedJob.delete({
        where: { studentId_jobId: { studentId: student.id, jobId: idStr } },
      });
      return responses.ok(res, 'Job removed from saved');
    } else {
      await prisma.savedJob.create({
        data: { studentId: student.id, jobId: idStr },
      });
      return responses.ok(res, 'Job saved');
    }
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/jobs/saved
 * Get saved jobs
 */
export async function getSavedJobs(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    const userIdStr = Array.isArray(userId) ? userId[0] : userId;

    if (!userIdStr) {
      return responses.unauthorized(res);
    }

    const student = await prisma.studentProfile.findUnique({
      where: { userId: userIdStr },
      select: { id: true },
    });

    if (!student) {
      return responses.notFound(res, 'Student not found');
    }

    const saved = await prisma.savedJob.findMany({
      where: { studentId: student.id },
      include: {
        job: {
          include: {
            employer: { select: { companyName: true } },
          },
        },
      },
    });

    return responses.ok(res, 'Saved jobs', saved);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/jobs/recommended
 * Get recommended jobs based on skills
 */
export async function getRecommendedJobs(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    const userIdStr = Array.isArray(userId) ? userId[0] : userId;

    if (!userIdStr) {
      return responses.unauthorized(res);
    }

    const student = await prisma.studentProfile.findUnique({
      where: { userId: userIdStr },
      select: { skills: true },
    });

    if (!student) {
      return responses.notFound(res, 'Student not found');
    }

    // Find jobs matching student skills
    const jobs = await prisma.job.findMany({
      where: { status: 'ACTIVE' },
      include: { employer: { select: { companyName: true } } },
      take: 10,
    });

    // Filter and score jobs based on skill match
    const recommended = jobs
      .map((job) => ({
        ...job,
        matchScore: student.skills
          ? (student.skills.filter((s) => job.skills?.includes(s)).length / job.skills.length) *
            100
          : 0,
      }))
      .sort((a, b) => b.matchScore - a.matchScore);

    return responses.ok(res, 'Recommended jobs', recommended);
  } catch (error) {
    next(error);
  }
}