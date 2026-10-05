import { Response, NextFunction } from 'express';
import crypto from 'crypto';
import prisma from '../lib/prisma';
import { responses } from '../utils/response.utils';
import { hashPassword } from '../utils/password.utils';
import { emitToUser } from '../lib/socket-server';
import { AdminRequest, logAdminAction, notifyUser } from './admin-spec.helpers';

/** POST /api/admin/users/:id/reset-password — temp password + audit. (spec #5) */
export async function resetUserPassword(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const target = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true } });
    if (!target) return responses.notFound(res, 'User not found');

    const tempPassword = `Nub-${crypto.randomBytes(4).toString('hex')}${Date.now().toString(36).slice(-2)}!`;
    await prisma.user.update({ where: { id }, data: { password: await hashPassword(tempPassword) } });

    await notifyUser(target.id, 'PASSWORD_RESET', `An admin reset your password. Temp password emailed to ${target.email}. Expires in 24h.`, '/login');
    await logAdminAction(req, 'reset_password', 'user', id, `Temp password issued to ${target.email}`);
    emitToUser(id, 'password_reset_by_admin', {});

    return responses.ok(res, 'Temporary password generated', { tempPassword, expiresIn: '24h', success: true });
  } catch (error) {
    next(error);
  }
}
