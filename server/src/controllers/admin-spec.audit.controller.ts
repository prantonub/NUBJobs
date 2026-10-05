import { Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { responses } from '../utils/response.utils';
import { emitToUser } from '../lib/socket-server';
import { AdminRequest, logAdminAction, notifyUser, paginationMeta, parsePageLimit } from './admin-spec.helpers';

/** GET /api/admin/audit-logs — SUPER_ADMIN only (enforced in route). (spec #23) */
export async function listAuditLogs(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const { page, limit, skip } = parsePageLimit(req.query);
    const q = req.query as Record<string, string | undefined>;
    const where: any = {};
    if (q.adminId) where.adminId = String(q.adminId);
    if (q.action) where.action = { contains: String(q.action), mode: 'insensitive' };
    if (q.dateFrom || q.dateTo) {
      where.createdAt = {};
      if (q.dateFrom) where.createdAt.gte = new Date(String(q.dateFrom));
      if (q.dateTo) where.createdAt.lte = new Date(String(q.dateTo));
    }
    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
    ]);
    return responses.ok(res, 'Audit logs fetched', {
      logs: logs.map((l) => ({
        id: l.id, adminId: l.adminId, adminName: l.adminName, action: l.action,
        resource: `${l.resourceType}${l.resourceId ? `:${l.resourceId}` : ''}`,
        resourceType: l.resourceType, resourceId: l.resourceId,
        details: l.details, timestamp: l.createdAt, ipAddress: l.ipAddress,
      })),
      ...paginationMeta(total, page, limit),
    });
  } catch (error) {
    next(error);
  }
}

/** GET /api/admin/activity-logs/:userId — audit rows touching a user. (spec #24) */
export async function getUserActivityLogs(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
    const { page, limit, skip } = parsePageLimit(req.query);
    const where = { OR: [{ adminId: userId }, { resourceId: userId }] };
    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
    ]);
    return responses.ok(res, 'User activity fetched', {
      logs: logs.map((l) => ({ id: l.id, action: l.action, detail: l.details, timestamp: l.createdAt })),
      ...paginationMeta(total, page, limit),
    });
  } catch (error) {
    next(error);
  }
}

/** POST /api/admin/message/:userId — admin → user via notifications. (spec #25) */
export async function sendAdminMessage(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
    const { message, reason } = req.body as { message?: string; reason?: string };
    if (!message?.trim()) return responses.badRequest(res, 'Message text is required');
    const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!target) return responses.notFound(res, 'User not found');

    await notifyUser(target.id, 'ADMIN_MESSAGE', `Message from NUBJobs support: ${message.trim()}`, '/messages');
    emitToUser(target.id, 'new_message', { from: 'admin', message: message.trim() });
    await logAdminAction(req, 'message_user', 'user', userId, reason ?? message.trim().slice(0, 200));

    return responses.ok(res, 'Message sent', { sent: true, to: userId });
  } catch (error) {
    next(error);
  }
}

/** GET /api/admin/messages/overview — recent messages, read-only monitoring. */
export async function getAdminMessagesOverview(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const { page, limit, skip } = parsePageLimit(req.query);
    const [total, messages] = await Promise.all([
      prisma.message.count(),
      prisma.message.findMany({
        skip, take: limit, orderBy: { createdAt: 'desc' },
        select: {
          id: true, content: true, createdAt: true, applicationId: true,
          sender: { select: { name: true, role: true } },
          application: { select: { job: { select: { title: true } } } },
        },
      }),
    ]);
    return responses.ok(res, 'Messages overview fetched', {
      messages, ...paginationMeta(total, page, limit),
    });
  } catch (error) {
    next(error);
  }
}
