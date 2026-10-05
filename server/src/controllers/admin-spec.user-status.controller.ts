import { Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { responses } from '../utils/response.utils';
import { AdminRequest, logAdminAction, notifyUser } from './admin-spec.helpers';
import { getUserDetail } from './admin-spec.user-detail.controller';

export { getUserDetail };

/** PATCH /api/admin/users/:id/status — ban/suspend with reason, email + audit. (spec #4) */
export async function updateUserStatus(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { status, reason } = req.body as { status?: string; reason?: string };
    const normalized = String(status ?? '').toUpperCase();
    if (!['ACTIVE', 'INACTIVE', 'BANNED'].includes(normalized)) {
      return responses.badRequest(res, 'status must be ACTIVE, INACTIVE or BANNED');
    }
    if (normalized !== 'ACTIVE' && !reason?.trim()) {
      return responses.badRequest(res, 'A reason is required when banning or suspending a user');
    }
    if (id === req.userId) return responses.badRequest(res, 'You cannot change your own status');
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return responses.notFound(res, 'User not found');

    const banned = normalized === 'BANNED';
    const user = await prisma.user.update({ where: { id }, data: { isBanned: banned } });

    await notifyUser(
      id,
      banned ? 'ACCOUNT_BANNED' : 'ACCOUNT_UNBANNED',
      banned
        ? `Your NUBJobs account has been suspended. Reason: ${reason}`
        : 'Your NUBJobs account has been reactivated. Welcome back!',
      banned ? undefined : '/login'
    );
    await logAdminAction(req, banned ? 'ban_user' : 'unban_user', 'user', id, reason ?? normalized);

    return responses.ok(res, `User ${banned ? 'banned' : 'reactivated'}`, {
      id: user.id, status: banned ? 'BANNED' : 'ACTIVE',
    });
  } catch (error) {
    next(error);
  }
}
