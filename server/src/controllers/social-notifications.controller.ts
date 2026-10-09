import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { responses } from '../utils/response.utils';
import { parsePage, publicUserSelect, toPublicUser, PublicUserRow } from '../utils/social.utils';

async function serializeNotifications(rows: any[]) {
  const fromIds = Array.from(new Set(rows.map((r) => r.fromUserId).filter(Boolean))) as string[];
  const fromUsers = fromIds.length
    ? await prisma.user.findMany({ where: { id: { in: fromIds } }, select: publicUserSelect })
    : [];
  const byId = new Map(fromUsers.map((u) => [u.id, u]));
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    message: r.message,
    link: r.link,
    isRead: r.isRead,
    postId: r.postId,
    commentId: r.commentId,
    messageId: r.messageId,
    createdAt: r.createdAt,
    fromUser: r.fromUserId ? toPublicUser(byId.get(r.fromUserId) as PublicUserRow) : null,
  }));
}

/** GET /api/social/notifications */
export async function listNotifications(req: AuthRequest, res: Response) {
  const me = req.userId!;
  const { page, limit, skip, take } = parsePage(req.query);
  const where = { userId: me };
  const [rows, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { ...where, isRead: false } }),
  ]);
  res.json({
    success: true,
    statusCode: 200,
    message: 'Notifications fetched',
    data: {
      notifications: await serializeNotifications(rows),
      unreadCount,
      pagination: { page, limit, total, hasMore: skip + rows.length < total },
    },
  });
}

/** PATCH /api/social/notifications/:id/read */
export async function markNotificationRead(req: AuthRequest, res: Response) {
  const me = req.userId!;
  const id = String(req.params.id);
  const row = await prisma.notification.findUnique({ where: { id } });
  if (!row || row.userId !== me) return responses.notFound(res, 'Notification not found');
  const updated = row.isRead ? row : await prisma.notification.update({ where: { id }, data: { isRead: true } });
  responses.ok(res, 'Marked as read', { success: true, isRead: updated.isRead });
}

/** PATCH /api/social/notifications/read-all */
export async function markAllRead(req: AuthRequest, res: Response) {
  const me = req.userId!;
  await prisma.notification.updateMany({ where: { userId: me, isRead: false }, data: { isRead: true } });
  responses.ok(res, 'All notifications marked as read', { success: true });
}

/** GET /api/social/notifications/unread-count */
export async function notificationUnreadCount(req: AuthRequest, res: Response) {
  const me = req.userId!;
  const unreadCount = await prisma.notification.count({ where: { userId: me, isRead: false } });
  responses.ok(res, 'Unread count', { unreadCount });
}
