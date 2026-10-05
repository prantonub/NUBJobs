import { Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { responses } from '../utils/response.utils';
import { AdminRequest, paginationMeta, parsePageLimit } from './admin-spec.helpers';

/** GET /api/admin/jobs — status/category/featured/search + pagination. (spec #7) */
export async function listAllJobs(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const { page, limit, skip } = parsePageLimit(req.query);
    const { status, category, featured, search } = req.query as Record<string, string | undefined>;
    const where: any = {};
    if (status && ['DRAFT', 'PENDING', 'ACTIVE', 'CLOSED', 'REJECTED'].includes(String(status).toUpperCase())) {
      where.status = String(status).toUpperCase();
    }
    if (category) where.category = { contains: String(category), mode: 'insensitive' };
    if (featured === 'true') where.featured = true;
    if (featured === 'false') where.featured = false;
    if (search) {
      where.OR = [
        { title: { contains: String(search), mode: 'insensitive' } },
        { employer: { companyName: { contains: String(search), mode: 'insensitive' } } },
      ];
    }
    const [total, jobs] = await Promise.all([
      prisma.job.count({ where }),
      prisma.job.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: {
          employer: { select: { companyName: true } },
          _count: { select: { applications: true } },
        },
      }),
    ]);
    return responses.ok(res, 'Jobs fetched', {
      jobs: jobs.map((j) => ({
        id: j.id, title: j.title, employer: j.employer.companyName, status: j.status,
        applicants: j._count.applications, views: j.views, postedAt: j.createdAt, featured: j.featured,
      })),
      ...paginationMeta(total, page, limit),
    });
  } catch (error) {
    next(error);
  }
}

/** GET /api/admin/jobs/:id — full detail + employer + first 10 applications. (spec #8) */
export async function getAdminJobDetail(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        employer: { select: { id: true, companyName: true, location: true, isVerified: true, user: { select: { email: true } } } },
        applications: {
          take: 10, orderBy: { createdAt: 'desc' },
          select: { id: true, status: true, matchScore: true, createdAt: true, student: { select: { user: { select: { name: true } } } } },
        },
        _count: { select: { applications: true } },
      },
    });
    if (!job) return responses.notFound(res, 'Job not found');
    return responses.ok(res, 'Job detail fetched', {
      ...job, employerInfo: job.employer, applicationsCount: job._count.applications,
    });
  } catch (error) {
    next(error);
  }
}
