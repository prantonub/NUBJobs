import { Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { responses } from '../utils/response.utils';
import { AdminRequest } from './admin-spec.helpers';

/** GET /api/admin/users/:id — profile + side counts + audit trail. (spec #3) */
export async function getUserDetail(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, name: true, email: true, role: true, isBanned: true,
        isEmailVerified: true, createdAt: true, updatedAt: true,
        studentProfile: {
          include: {
            applications: { select: { id: true, status: true, job: { select: { title: true } } }, take: 20 },
            _count: { select: { applications: true, savedJobs: true } },
          },
        },
        employerProfile: {
          include: {
            jobs: { select: { id: true, title: true, status: true } },
            _count: { select: { jobs: true } },
          },
        },
      },
    });
    if (!user) return responses.notFound(res, 'User not found');
    const activityLog = await prisma.auditLog.findMany({
      where: { OR: [{ adminId: id }, { resourceId: id }] },
      orderBy: { createdAt: 'desc' }, take: 20,
    });
    return responses.ok(res, 'User detail fetched', {
      id: user.id, name: user.name, email: user.email,
      phone: user.studentProfile?.phone ?? user.employerProfile?.phone ?? null,
      role: user.role, status: user.isBanned ? 'BANNED' : 'ACTIVE',
      profile: user.studentProfile ?? user.employerProfile ?? null,
      joinedAt: user.createdAt, lastLogin: user.updatedAt, activityLog,
    });
  } catch (error) {
    next(error);
  }
}
