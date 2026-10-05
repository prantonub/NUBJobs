import { Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { responses } from '../utils/response.utils';
import { AdminRequest, paginationMeta, parsePageLimit } from './admin-spec.helpers';

/** GET /api/admin/users — role/status/search filters + pagination. (spec #2) */
export async function listAllUsers(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const { page, limit, skip } = parsePageLimit(req.query);
    const { role, status, search } = req.query as Record<string, string | undefined>;
    const where: any = {};
    if (role && ['STUDENT', 'EMPLOYER', 'ADMIN'].includes(String(role).toUpperCase())) {
      where.role = String(role).toUpperCase();
    }
    if (status) {
      const s = String(status).toUpperCase();
      if (s === 'BANNED') where.isBanned = true;
      else if (s === 'ACTIVE') where.isBanned = false;
    }
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { email: { contains: String(search), mode: 'insensitive' } },
      ];
    }
    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        select: {
          id: true, name: true, email: true, role: true, isBanned: true,
          isEmailVerified: true, createdAt: true, updatedAt: true,
          studentProfile: { select: { department: true, cgpa: true } },
          employerProfile: { select: { companyName: true, isVerified: true } },
        },
      }),
    ]);
    return responses.ok(res, 'Users fetched', {
      users: users.map((u) => ({
        id: u.id, name: u.name, email: u.email, phone: null, role: u.role,
        status: u.isBanned ? 'BANNED' : 'ACTIVE',
        joinedAt: u.createdAt, lastLogin: u.updatedAt, applicationsCount: null,
        department: u.studentProfile?.department ?? null,
        companyName: u.employerProfile?.companyName ?? null,
        isVerified: u.isEmailVerified,
      })),
      ...paginationMeta(total, page, limit),
    });
  } catch (error) {
    next(error);
  }
}
