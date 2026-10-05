import { Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { responses } from '../utils/response.utils';
import { AdminRequest, paginationMeta, parsePageLimit } from './admin-spec.helpers';

/** GET /api/admin/companies — verified filter + counts. (spec #13) */
export async function listAllCompanies(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const { page, limit, skip } = parsePageLimit(req.query);
    const { verified, search } = req.query as Record<string, string | undefined>;
    const where: any = {};
    if (verified === 'true') where.isVerified = true;
    if (verified === 'false') where.isVerified = false;
    if (search) {
      where.OR = [
        { companyName: { contains: String(search), mode: 'insensitive' } },
        { location: { contains: String(search), mode: 'insensitive' } },
      ];
    }
    const [total, companies] = await Promise.all([
      prisma.employerProfile.count({ where }),
      prisma.employerProfile.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: { user: { select: { email: true, name: true } }, _count: { select: { jobs: true } } },
      }),
    ]);
    return responses.ok(res, 'Companies fetched', {
      companies: companies.map((c) => ({
        id: c.id, name: c.companyName, location: c.location,
        jobsCount: c._count.jobs, verified: c.isVerified, verificationDate: c.verifiedAt,
        verificationStatus: c.verificationStatus, verificationDocument: c.verificationDocument,
        email: c.user.email,
      })),
      ...paginationMeta(total, page, limit),
    });
  } catch (error) {
    next(error);
  }
}

/** GET /api/admin/companies/verification-requests — queue. (spec #14) */
export async function listVerificationRequests(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const { page, limit, skip } = parsePageLimit(req.query);
    const status = String((req.query as Record<string, string | undefined>).status ?? 'PENDING').toUpperCase();
    const where: any = {};
    if (['PENDING', 'APPROVED', 'REJECTED'].includes(status)) where.verificationStatus = status;
    const [total, requests] = await Promise.all([
      prisma.employerProfile.count({ where }),
      prisma.employerProfile.findMany({
        where, skip, take: limit, orderBy: { updatedAt: 'desc' },
        include: { user: { select: { email: true, name: true } } },
      }),
    ]);
    return responses.ok(res, 'Verification requests fetched', {
      requests: requests.map((c) => ({
        id: c.id, company: c.companyName, document: c.verificationDocument,
        submittedAt: c.updatedAt, status: c.verificationStatus, email: c.user.email,
      })),
      ...paginationMeta(total, page, limit),
    });
  } catch (error) {
    next(error);
  }
}
