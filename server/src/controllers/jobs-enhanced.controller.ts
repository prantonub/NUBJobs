import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { responses } from '../utils/response.utils';

export interface AuthRequest extends Request {
  userId?: string | string[];
  email?: string;
  role?: string;
}

/** Mirrors the Prisma `JobType` enum — anything else must not reach Prisma. */
const JOB_TYPES = ['FULL_TIME', 'PART_TIME', 'INTERNSHIP', 'CONTRACT', 'REMOTE', 'HYBRID'];
type JobTypeValue = (typeof JOB_TYPES)[number];

/**
 * GET /api/jobs
 * List jobs with advanced filtering and pagination.
 *
 * Response shape matches the client hooks: `{ data: Job[], pagination }`.
 */
export async function listJobs(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const readParam = (value: unknown) => {
      if (Array.isArray(value)) return String(value[0] ?? '');
      return value === undefined || value === null ? '' : String(value);
    };

    const keyword = (readParam(req.query.q) || readParam(req.query.search)).trim();
    const category = readParam(req.query.category);
    const rawType = readParam(req.query.jobType) || readParam(req.query.type);
    const location = readParam(req.query.location);
    const salaryMin = readParam(req.query.salaryMin);
    const salaryMax = readParam(req.query.salaryMax);
    const minCgpa = readParam(req.query.minCgpa);
    const postedDays = readParam(req.query.postedDays);
    const nubOnly = readParam(req.query.nubOnly);
    const sort = readParam(req.query.sort) || 'newest';

    const pageNum = Math.max(1, parseInt(readParam(req.query.page)) || 1);
    const pageSize = Math.max(1, Math.min(50, parseInt(readParam(req.query.limit)) || 10));
    const skip = (pageNum - 1) * pageSize;

    const where: any = { status: 'ACTIVE' };

    // "software-engineering" (category cards) and "Software Engineering" (DB)
    // must both match, so slugs are normalised into a readable term.
    if (category) {
      const normalized = category.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
      where.category = { contains: normalized, mode: 'insensitive' };
    }

    // Only enum values are forwarded, otherwise Prisma throws a 500.
    const typeValue = rawType.trim().toUpperCase().replace(/[\s-]+/g, '_');
    if (JOB_TYPES.includes(typeValue as JobTypeValue)) where.type = typeValue;
    if (location) where.location = { contains: location, mode: 'insensitive' };
    if (salaryMin) where.salaryMin = { gte: parseInt(salaryMin) };
    if (salaryMax) where.salaryMax = { lte: parseInt(salaryMax) };
    if (minCgpa) where.minCgpa = { lte: parseFloat(minCgpa) };
    if (nubOnly === 'true') where.targetUniversity = 'NUB';

    if (keyword) {
      where.OR = [
        { title: { contains: keyword, mode: 'insensitive' } },
        { description: { contains: keyword, mode: 'insensitive' } },
        { category: { contains: keyword, mode: 'insensitive' } },
        { location: { contains: keyword, mode: 'insensitive' } },
        { employer: { companyName: { contains: keyword, mode: 'insensitive' } } },
      ];
    }

    if (postedDays) {
      const since = new Date();
      since.setDate(since.getDate() - parseInt(postedDays));
      where.createdAt = { gte: since };
    }

    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'salary' || sort === 'salary-high') orderBy = { salaryMax: 'desc' };
    else if (sort === 'salary-low') orderBy = { salaryMin: 'asc' };
    else if (sort === 'views') orderBy = { views: 'desc' };
    else if (sort === 'applicants') orderBy = { applicantCount: 'desc' };
    else if (sort === 'featured') orderBy = [{ featured: 'desc' }, { createdAt: 'desc' }];

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        include: {
          employer: { select: { companyName: true, logoUrl: true, isVerified: true } },
        },
        orderBy,
        skip,
        take: pageSize,
      }),
      prisma.job.count({ where }),
    ]);

    return res.json({
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
 * GET /api/jobs/categories
 * Distinct categories with live job counts, used by the listing filters,
 * the home page category grid and the hero search.
 */
export async function getJobCategories(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const grouped = await prisma.job.groupBy({
      by: ['category'],
      where: { status: 'ACTIVE', category: { not: null } },
      _count: { _all: true },
    });

    const categories = grouped
      .filter((row) => Boolean(row.category && row.category.trim()))
      .map((row) => {
        const label = (row.category as string).trim();
        return {
          label,
          value: label,
          slug: label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
          count: row._count._all,
        };
      })
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

    return res.json({ data: categories });
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