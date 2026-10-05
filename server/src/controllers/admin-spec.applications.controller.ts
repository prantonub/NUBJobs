import { Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { responses } from '../utils/response.utils';
import { AdminRequest, paginationMeta, parsePageLimit } from './admin-spec.helpers';

/** GET /api/admin/applications — status/job/company/search + pagination. (spec #17) */
export async function listAllApplications(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const { page, limit, skip } = parsePageLimit(req.query);
    const q = req.query as Record<string, string | undefined>;
    const where: any = {};
    if (q.status) where.status = String(q.status).toUpperCase();
    if (q.jobId) where.jobId = String(q.jobId);
    if (q.companyId) where.job = { employerId: String(q.companyId) };
    if (q.search) {
      where.OR = [
        { student: { user: { name: { contains: String(q.search), mode: 'insensitive' } } } },
        { job: { title: { contains: String(q.search), mode: 'insensitive' } } },
      ];
    }
    const [total, applications] = await Promise.all([
      prisma.application.count({ where }),
      prisma.application.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: {
          student: { select: { user: { select: { name: true, email: true } } } },
          job: { select: { title: true, employer: { select: { companyName: true } } } },
        },
      }),
    ]);
    return responses.ok(res, 'Applications fetched', {
      applications: applications.map((a) => ({
        id: a.id, student: a.student.user.name, job: a.job.title,
        company: a.job.employer.companyName, status: a.status,
        matchScore: a.matchScore, appliedAt: a.createdAt,
      })),
      ...paginationMeta(total, page, limit),
    });
  } catch (error) {
    next(error);
  }
}

/** GET /api/admin/applications/:id — profile + resume + messages + timeline. (spec #18) */
export async function getAdminApplicationDetail(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        student: { include: { user: { select: { id: true, name: true, email: true } } } },
        job: { include: { employer: { select: { companyName: true } } } },
        messages: { orderBy: { createdAt: 'asc' }, include: { sender: { select: { name: true, role: true } } } },
      },
    });
    if (!application) return responses.notFound(res, 'Application not found');
    return responses.ok(res, 'Application detail fetched', {
      ...application,
      timeline: [
        { status: 'APPLIED', at: application.createdAt },
        ...(application.reviewedAt ? [{ status: 'REVIEWED', at: application.reviewedAt }] : []),
        { status: application.status, at: application.updatedAt },
      ],
    });
  } catch (error) {
    next(error);
  }
}

/** GET /api/admin/pipeline — read-only kanban. (spec §5) */
export async function getAdminPipeline(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const q = req.query as Record<string, string | undefined>;
    const where: any = {};
    if (q.companyId) where.job = { employerId: String(q.companyId) };
    if (q.jobId) where.jobId = String(q.jobId);
    const applications = await prisma.application.findMany({
      where, orderBy: { createdAt: 'desc' }, take: 500,
      include: {
        student: { select: { cgpa: true, skills: true, user: { select: { name: true } } } },
        job: { select: { title: true, employer: { select: { companyName: true } } } },
      },
    });
    const columns: Record<string, typeof applications> = {
      APPLIED: [], REVIEWED: [], SHORTLISTED: [], INTERVIEWED: [], HIRED: [], REJECTED: [],
    };
    for (const a of applications) {
      if (columns[a.status]) columns[a.status].push(a);
    }
    const card = (a: (typeof applications)[number]) => ({
      id: a.id, studentName: a.student.user.name, jobTitle: a.job.title,
      company: a.job.employer.companyName, matchScore: a.matchScore,
      cgpa: a.student.cgpa, skills: a.student.skills, appliedAt: a.createdAt,
    });
    return responses.ok(res, 'Pipeline fetched', {
      applied: columns.APPLIED.map(card),
      reviewed: columns.REVIEWED.map(card),
      shortlisted: columns.SHORTLISTED.map(card),
      interviewed: columns.INTERVIEWED.map(card),
      hired: columns.HIRED.map(card),
      rejected: columns.REJECTED.map(card),
    });
  } catch (error) {
    next(error);
  }
}
