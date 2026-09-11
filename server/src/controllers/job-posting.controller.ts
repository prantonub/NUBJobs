import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { responses } from '../utils/response.utils';

export interface AuthRequest extends Request {
  userId?: string;
  email?: string;
  role?: string;
}

/**
 * POST /api/employer/jobs/create
 * Create a new job posting
 */
export async function createJob(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
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

    if (!userId) {
      return responses.unauthorized(res);
    }

    const employer = await prisma.employerProfile.findUnique({
      where: { userId },
    });

    if (!employer) {
      return responses.notFound(res, 'Employer profile not found');
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
        skills: skills || [],
        deadline: deadline ? new Date(deadline) : null,
        targetUniversity: targetUniversity || 'ALL',
        status: 'DRAFT',
      },
      include: {
        employer: {
          select: { companyName: true },
        },
      },
    });

    return responses.created(res, 'Job created successfully', job);
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/employer/jobs/:id
 * Update job posting (draft)
 */
export async function updateJob(req: AuthRequest, res: Response, next: NextFunction) {
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

    const job = await prisma.job.findUnique({
      where: { id },
      include: { employer: true },
    });

    if (!job) {
      return responses.notFound(res, 'Job not found');
    }

    if (job.employerId !== employer.id) {
      return responses.forbidden(res);
    }

    if (job.status !== 'DRAFT') {
      return responses.badRequest(res, 'Only draft jobs can be edited');
    }

    const updated = await prisma.job.update({
      where: { id },
      data: req.body,
    });

    return responses.ok(res, 'Job updated successfully', updated);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/employer/jobs/:id/publish
 * Publish job posting (change status to ACTIVE)
 */
export async function publishJob(req: AuthRequest, res: Response, next: NextFunction) {
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

    const job = await prisma.job.findUnique({
      where: { id },
      include: { employer: true },
    });

    if (!job) {
      return responses.notFound(res, 'Job not found');
    }

    if (job.employerId !== employer.id) {
      return responses.forbidden(res);
    }

    // Validate job has required fields
    if (!job.title || !job.description || job.skills.length === 0) {
      return responses.badRequest(res, 'Job must have title, description, and skills');
    }

    const published = await prisma.job.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        publishedAt: new Date(),
      },
      include: {
        employer: {
          select: { companyName: true },
        },
      },
    });

    return responses.ok(res, 'Job published successfully', published);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/employer/jobs/:id/close
 * Close job posting
 */
export async function closeJob(req: AuthRequest, res: Response, next: NextFunction) {
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

    const job = await prisma.job.findUnique({
      where: { id },
      include: { employer: true },
    });

    if (!job) {
      return responses.notFound(res, 'Job not found');
    }

    if (job.employerId !== employer.id) {
      return responses.forbidden(res);
    }

    const closed = await prisma.job.update({
      where: { id },
      data: { status: 'CLOSED' },
    });

    return responses.ok(res, 'Job closed successfully', closed);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/employer/jobs/:id/preview
 * Preview job before publishing
 */
export async function previewJob(req: AuthRequest, res: Response, next: NextFunction) {
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

    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        employer: {
          select: {
            companyName: true,
            logoUrl: true,
            website: true,
            linkedinUrl: true,
          },
        },
        _count: {
          select: { applications: true },
        },
      },
    });

    if (!job) {
      return responses.notFound(res, 'Job not found');
    }

    if (job.employerId !== employer.id) {
      return responses.forbidden(res);
    }

    return responses.ok(res, 'Job preview', job);
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/employer/jobs/:id
 * Delete job (only draft jobs)
 */
export async function deleteJob(req: AuthRequest, res: Response, next: NextFunction) {
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

    const job = await prisma.job.findUnique({
      where: { id },
      include: { employer: true },
    });

    if (!job) {
      return responses.notFound(res, 'Job not found');
    }

    if (job.employerId !== employer.id) {
      return responses.forbidden(res);
    }

    if (job.status !== 'DRAFT') {
      return responses.badRequest(res, 'Only draft jobs can be deleted');
    }

    await prisma.job.delete({ where: { id } });

    return responses.ok(res, 'Job deleted successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/employer/jobs/improve-description
 * AI improve job description
 */
export async function improveDescription(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { description } = req.body;

    if (!description) {
      return responses.badRequest(res, 'Description is required');
    }

    // Call Claude API to improve description
    const improvedDescription = `${description}\n\n[Enhanced by AI]`;

    return responses.ok(res, 'Description improved', {
      original: description,
      improved: improvedDescription,
    });
  } catch (error) {
    next(error);
  }
}