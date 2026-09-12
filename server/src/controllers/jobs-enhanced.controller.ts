import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { responses } from '../utils/response.utils';
import { calculateMatchScore } from '../services/ai.service';

export interface AuthRequest extends Request {
  userId?: string;
  email?: string;
  role?: string;
}

/**
 * GET /api/jobs
 * List jobs with advanced filtering, sorting, and pagination
 */
export async function listJobs(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const {
      search,
      category,
      type,
      location,
      salaryMin,
      salaryMax,
      minCgpa,
      targetUniversity,
      sort = 'newest',
      page = 1,
      limit = 10,
    } = req.query;

    // Build where clause
    const where: any = { status: 'ACTIVE' };

    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (category) where.category = category;
    if (type) where.type = type;
    if (location) where.location = { contains: location as string, mode: 'insensitive' };

    if (salaryMin || salaryMax) {
      where.AND = [];
      if (salaryMin) where.AND.push({ salaryMin: { gte: parseInt(salaryMin as string) } });
      if (salaryMax) where.AND.push({ salaryMax: { lte: parseInt(salaryMax as string) } });
    }

    if (minCgpa) where.minCgpa = { lte: parseFloat(minCgpa as string) };
    if (targetUniversity) where.targetUniversity = targetUniversity;

    // Build orderBy
    let orderBy: any = { createdAt: 'desc' };
    switch (sort) {
      case 'salary-high':
        orderBy = { salaryMax: 'desc' };
        break;
      case 'salary-low':
        orderBy = { salaryMin: 'asc' };
        break;
      case 'views':
        orderBy = { views: 'desc' };
        break;
      case 'applicants':
        orderBy = { applicantCount: 'desc' };
        break;
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const pageSize = Math.max(1, Math.min(50, parseInt(limit as string) || 10));
    const skip = (pageNum - 1) * pageSize;

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        include: {
          employer: {
            select: {
              id: true,
              companyName: true,
              logoUrl: true,
              isVerified: true,
            },
          },
          _count: {
            select: { applications: true },
          },
        },
      }),
      prisma.job.count({ where }),
    ]);

    // Calculate match scores if authenticated
    let jobsWithMatch = jobs;
    if (req.userId) {
      const student = await prisma.studentProfile.findUnique({
        where: { userId: req.userId },
      });

      if (student) {
        jobsWithMatch = await Promise.all(
          jobs.map(async (job) => {
            const matchScore = await calculateMatchScore(job.id, student.id);
            return { ...job, matchScore };
          })
        );
      }
    }

    return responses.ok(res, 'Jobs fetched', {
      data: jobsWithMatch,
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
 * Get job detail and increment views
 */
export async function getJobDetail(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        employer: {
          select: {
            id: true,
            companyName: true,
            logoUrl: true,
            website: true,
            about: true,
            isVerified: true,
            linkedinUrl: true,
          },
        },
        _count: {
          select: { applications: true, savedJobs: true },
        },
      },
    });

    if (!job) {
      return responses.notFound(res, 'Job not found');
    }

    if (job.status !== 'ACTIVE') {
      return responses.notFound(res, 'Job not available');
    }

    // Increment views
    await prisma.job.update({
      where: { id },
      data: { views: { increment: 1 } },
    });

    // Calculate match score if authenticated
    let matchScore = 0;
    if (req.userId) {
      const student = await prisma.studentProfile.findUnique({
        where: { userId: req.userId },
      });
      if (student) {
        matchScore = await calculateMatchScore(id, student.id);
      }
    }

    return responses.ok(res, 'Job detail', {
      ...job,
      matchScore,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/jobs
 * Create new job (employer only)
 */
export async function createJob(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    if (!userId || req.role !== 'EMPLOYER') {
      return responses.forbidden(res);
    }

    const employer = await prisma.employerProfile.findUnique({
      where: { userId },
    });

    if (!employer) {
      return responses.notFound(res, 'Employer profile not found');
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
      targetUniversity,
    } = req.body;

    if (!title || !description || !type || !skills?.length) {
      return responses.badRequest(res, 'Missing required fields');
    }

    const job = await prisma.job.create({
      data: {
        employerId: employer.id,
        title,
        description,
        category,
        type,
        location,
        salaryMin: salaryMin ? parseInt(salaryMin) : null,
        salaryMax: salaryMax ? parseInt(salaryMax) : null,
        minCgpa: minCgpa ? parseFloat(minCgpa) : null,
        skills,
        deadline: deadline ? new Date(deadline) : null,
        targetUniversity: targetUniversity || 'ALL',
        status: employer.isVerified ? 'ACTIVE' : 'PENDING',
      },
      include: {
        employer: { select: { companyName: true } },
      },
    });

    return responses.created(res, 'Job created', job);
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/jobs/:id
 * Update job (employer only, draft/pending only)
 */
export async function updateJob(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!userId || req.role !== 'EMPLOYER') {
      return responses.forbidden(res);
    }

    const job = await prisma.job.findUnique({
      where: { id },
      include: { employer: true },
    });

    if (!job) {
      return responses.notFound(res, 'Job not found');
    }

    if (job.employer.userId !== userId) {
      return responses.forbidden(res, 'Not job owner');
    }

    if (!['DRAFT', 'PENDING'].includes(job.status)) {
      return responses.badRequest(res, 'Can only edit draft/pending jobs');
    }

    const updated = await prisma.job.update({
      where: { id },
      data: {
        title: req.body.title || job.title,
        description: req.body.description || job.description,
        category: req.body.category || job.category,
        type: req.body.type || job.type,
        location: req.body.location || job.location,
        salaryMin: req.body.salaryMin ? parseInt(req.body.salaryMin) : job.salaryMin,
        salaryMax: req.body.salaryMax ? parseInt(req.body.salaryMax) : job.salaryMax,
        minCgpa: req.body.minCgpa ? parseFloat(req.body.minCgpa) : job.minCgpa,
        skills: req.body.skills || job.skills,
        deadline: req.body.deadline ? new Date(req.body.deadline) : job.deadline,
        targetUniversity: req.body.targetUniversity || job.targetUniversity,
      },
    });

    return responses.ok(res, 'Job updated', updated);
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/jobs/:id
 * Delete job (employer only, draft only)
 */
export async function deleteJob(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!userId || req.role !== 'EMPLOYER') {
      return responses.forbidden(res);
    }

    const job = await prisma.job.findUnique({
      where: { id },
      include: { employer: true },
    });

    if (!job) {
      return responses.notFound(res, 'Job not found');
    }

    if (job.employer.userId !== userId) {
      return responses.forbidden(res);
    }

    if (job.status !== 'DRAFT') {
      return responses.badRequest(res, 'Only draft jobs can be deleted');
    }

    await prisma.job.delete({ where: { id } });
    return responses.ok(res, 'Job deleted');
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/jobs/my
 * Get current employer's jobs
 */
export async function getMyJobs(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    if (!userId || req.role !== 'EMPLOYER') {
      return responses.forbidden(res);
    }

    const { status = 'ACTIVE', page = 1, limit = 10 } = req.query;

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
          _count: { select: { applications: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.job.count({ where }),
    ]);

    return responses.ok(res, 'Your jobs', {
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
 * POST /api/jobs/:id/save
 * Toggle save job
 */
export async function toggleSaveJob(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!userId) {
      return responses.unauthorized(res);
    }

    const student = await prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (!student) {
      return responses.notFound(res, 'Student not found');
    }

    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) {
      return responses.notFound(res, 'Job not found');
    }

    const existing = await prisma.savedJob.findUnique({
      where: {
        studentId_jobId: { studentId: student.id, jobId: id },
      },
    });

    if (existing) {
      await prisma.savedJob.delete({
        where: {
          studentId_jobId: { studentId: student.id, jobId: id },
        },
      });
      return responses.ok(res, 'Job removed from saved');
    } else {
      await prisma.savedJob.create({
        data: { studentId: student.id, jobId: id },
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
    const { page = 1, limit = 10 } = req.query;

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

    const [saved, total] = await Promise.all([
      prisma.savedJob.findMany({
        where: { studentId: student.id },
        include: {
          job: {
            include: {
              employer: {
                select: { companyName: true, logoUrl: true },
              },
            },
          },
        },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.savedJob.count({ where: { studentId: student.id } }),
    ]);

    return responses.ok(res, 'Saved jobs', {
      data: saved,
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
 * GET /api/jobs/recommended
 * Get recommended jobs based on student skills
 */
export async function getRecommendedJobs(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    if (!userId) {
      return responses.unauthorized(res);
    }

    const student = await prisma.studentProfile.findUnique({
      where: { userId },
      select: { id: true, skills: true, cgpa: true },
    });

    if (!student) {
      return responses.notFound(res, 'Student not found');
    }

    // Find jobs that match student skills and CGPA
    const jobs = await prisma.job.findMany({
      where: {
        status: 'ACTIVE',
        minCgpa: { lte: student.cgpa || 4.0 },
      },
      take: 6,
      include: {
        employer: {
          select: { companyName: true, logoUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Score jobs by skill match
    const jobsWithScore = jobs.map((job) => {
      const skillMatches = job.skills.filter((skill: string) =>
        student.skills?.includes(skill)
      ).length;
      const matchPercentage = (skillMatches / job.skills.length) * 100;
      return { ...job, skillMatchPercentage: matchPercentage };
    });

    // Sort by match percentage
    jobsWithScore.sort((a, b) => b.skillMatchPercentage - a.skillMatchPercentage);

    return responses.ok(res, 'Recommended jobs', jobsWithScore);
  } catch (error) {
    next(error);
  }
}