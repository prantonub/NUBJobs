import { Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { responses } from '../utils/response.utils';
import { AdminRequest, logAdminAction, notifyUser } from './admin-spec.helpers';

/** PATCH /api/admin/disputes/:id/resolve — warn/ban/refund, both parties emailed. (spec #21) */
export async function resolveDispute(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { resolution, action, targetUser } = req.body as { resolution?: string; action?: string; targetUser?: string };
    if (!resolution?.trim()) return responses.badRequest(res, 'A resolution description is required');
    const normalizedAction = String(action ?? 'NONE').toUpperCase();
    const dispute = await prisma.dispute.findUnique({
      where: { id },
      include: {
        student: { select: { userId: true } },
        employer: { select: { userId: true } },
      },
    });
    if (!dispute) return responses.notFound(res, 'Dispute not found');
    if (dispute.status !== 'OPEN') return responses.badRequest(res, 'Only OPEN disputes can be resolved');

    const wantsBan = ['BAN_STUDENT', 'BAN_EMPLOYER'].includes(normalizedAction) || (normalizedAction === 'BAN' && targetUser);
    if (wantsBan) {
      const banStudent = normalizedAction === 'BAN_STUDENT' || (normalizedAction === 'BAN' && String(targetUser).toUpperCase().includes('STUDENT'));
      const banUserId = banStudent ? dispute.student?.userId : dispute.employer?.userId;
      if (banUserId) {
        await prisma.user.update({ where: { id: banUserId }, data: { isBanned: true } });
        await notifyUser(banUserId, 'ACCOUNT_BANNED', `Suspended following dispute ${dispute.id}. Resolution: ${resolution}`);
      }
    }

    const updated = await prisma.dispute.update({
      where: { id },
      data: { status: 'RESOLVED', action: normalizedAction, resolution, resolvedAt: new Date(), resolvedBy: req.userId ?? null },
    });

    if (dispute.student?.userId) {
      await notifyUser(dispute.student.userId, 'DISPUTE_UPDATE', `Your dispute (${dispute.type}) resolved: ${resolution}`);
    }
    if (dispute.employer?.userId) {
      await notifyUser(dispute.employer.userId, 'DISPUTE_UPDATE', `Dispute ${dispute.id} resolved: ${resolution}`);
    }
    await logAdminAction(req, 'resolve_dispute', 'dispute', id, `${normalizedAction}: ${resolution}`);

    return responses.ok(res, 'Dispute resolved', updated);
  } catch (error) {
    next(error);
  }
}
