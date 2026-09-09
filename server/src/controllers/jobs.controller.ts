import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { calculateMatchScore } from '../services/ai.service';

/**
 * GET /api/jobs
 * List all jobs with optional filtering, sorting, and pagination
 */
export const listJobs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      jobType,
      category,
      location,
      salaryMin,
      salaryMax,
      minCgpa,
      postedDays,
      nubOnly,
      sort = 'newest',
      page = 1,
      limit = 10,
    } = req.query;

    // Build filter object
    const where: any = { status: 'ACTIVE' };

    if (jobType) where.type = jobType;
    if (category) where.category = { contains: category, mode: 'insensitive' };
    if (location) where.location = { contains: location, mode: 'insensitive' };
    if (salaryMin) where.salaryMin = { gte: parseInt(salaryMin as string) };
    if (salaryMax) where.salaryMax = { lte: parseInt(salaryMax as string) };
    if (minCgpa) where.minCgpa = { lte: parseFloat(minCgpa as string) };
    if (nubOnly === 'true') where.targetUniversity = 'NUB';

    if (postedDays) {
      const days = parseInt(postedDays as string);
      const since = new Date();
      since.setDate(since.getDate() - days);
      where.createdAt = { gte: since };
    }

    // Build orderBy
    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'salary-high') orderBy = { salaryMax: 'desc' };
    else if (sort === 'salary-low') orderBy = { salaryMin: 'asc' };
    else if (sort === 'views') orderBy = { views: 'desc' };
    else if (sort === 'applicants') orderBy = { applicantCount: 'desc' };

    // Pagination
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const pageSize = Math.max(1, Math.min(50, parseInt(limit as string) || 10));
    const skip = (pageNum - 1) * pageSize;

    // Execute query
    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        include: {
          employer: {
            select: {
              companyName: true,
              logoUrl: true,
              isVerified: true,
            },
          },
        },
      }),
      prisma.job.count({ where }),
    ]);

    res.json({
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
};

/**
 * GET /api/jobs/:id
 * Get a single job with full details
 */
export const getJobDetail = async (req: Request, res: Response, next: NextFunction) => {
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
          select: { applications: true },
        },
      },
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Increment view count
    await prisma.job.update({
      where: { id },
      data: { views: { increment: 1 } },
    });

    res.json({ data: job });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/jobs/:id/match-score
 * Calculate AI match score for current student against this job
 */
export const getMatchScore = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
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

    const score = await calculateMatchScore(id, student.id);

    res.json({ data: { matchScore: score } });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/jobs/:id/save
 * Save a job for later
 */
export const saveJob = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
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

    // Check if job exists
    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Create saved job
    const saved = await prisma.savedJob.upsert({
      where: {
        studentId_jobId: {
          studentId: student.id,
          jobId: id,
        },
      },
      update: {},
      create: {
        studentId: student.id,
        jobId: id,
      },
    });

    res.json({ data: saved, message: 'Job saved' });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Job already saved' });
    }
    next(error);
  }
};

/**
 * DELETE /api/jobs/:id/save
 * Unsave a job
 */
export const unsaveJob = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
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

    await prisma.savedJob.deleteMany({
      where: {
        studentId: student.id,
        jobId: id,
      },
    });

    res.json({ message: 'Job removed from saved' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/jobs/:id/saved
 * Check if current student saved this job
 */
export const checkJobSaved = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = (req as any).userId;

    if (!userId) {
      return res.json({ data: { saved: false } });
    }

    const student = await prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (!student) {
      return res.json({ data: { saved: false } });
    }

    const saved = await prisma.savedJob.findUnique({
      where: {
        studentId_jobId: {
          studentId: student.id,
          jobId: id,
        },
      },
    });

    res.json({ data: { saved: !!saved } });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/saved-jobs
 * Get all saved jobs for current student
 */
export const getSavedJobs = async (req: Request, res: Response, next: NextFunction) => {
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

    const saved = await prisma.savedJob.findMany({
      where: { studentId: student.id },
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
      },
    });

    res.json({ data: saved });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/jobs/recommended
 * Get recommended jobs based on student profile
 */
export const getRecommendedJobs = async (req: Request, res: Response, next: NextFunction) => {
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

    const jobs = await prisma.job.findMany({
      where: {
        status: 'ACTIVE',
        minCgpa: { lte: student.cgpa || 4.0 },
      },
      take: 3,
      orderBy: { createdAt: 'desc' },
      include: {
        employer: {
          select: {
            companyName: true,
            logoUrl: true,
          },
        },
      },
    });

    res.json({ data: jobs });
  } catch (error) {
    next(error);
  }
};