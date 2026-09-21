import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { responses } from '../utils/response.utils';

export interface AuthRequest extends Request {
  userId?: string | string[];
  email?: string;
  role?: string;
}
// fix notification controller to use prisma and return proper responses
/**
 * GET /api/notifications
 * Get notifications with optional filtering
 */
export async function getNotifications(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    const userIdStr = Array.isArray(userId) ? userId[0] : userId;

    if (!userIdStr) {
      return responses.unauthorized(res);
    }

    const { unreadOnly = false, page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const pageSize = Math.max(1, Math.min(100, parseInt(limit as string) || 20));
    const skip = (pageNum - 1) * pageSize;

    const where: any = { userId: userIdStr };

    if (unreadOnly === 'true') {
      where.isRead = false;
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.notification.count({ where }),
    ]);

    return responses.ok(res, 'Notifications retrieved', {
      data: notifications,
      pagination: {
        total,
        page: pageNum,
        limit: pageSize,
        pages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/notifications/:id/read
 * Mark notification as read
 */
export async function markAsRead(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    const userIdStr = Array.isArray(userId) ? userId[0] : userId;
    const { id } = req.params;
    const idStr = Array.isArray(id) ? id[0] : id;

    if (!userIdStr) {
      return responses.unauthorized(res);
    }

    const notification = await prisma.notification.findUnique({
      where: { id: idStr },
    });

    if (!notification) {
      return responses.notFound(res, 'Notification not found');
    }

    if (notification.userId !== userIdStr) {
      return responses.forbidden(res);
    }

    const updated = await prisma.notification.update({
      where: { id: idStr },
      data: { isRead: true },
    });

    return responses.ok(res, 'Marked as read', updated);
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/notifications/mark-all-read
 * Mark all notifications as read
 */
export async function markAllAsRead(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    const userIdStr = Array.isArray(userId) ? userId[0] : userId;

    if (!userIdStr) {
      return responses.unauthorized(res);
    }

    await prisma.notification.updateMany({
      where: { userId: userIdStr, isRead: false },
      data: { isRead: true },
    });

    return responses.ok(res, 'All marked as read');
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/notifications/:id
 * Delete notification
 */
export async function deleteNotification(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    const userIdStr = Array.isArray(userId) ? userId[0] : userId;
    const { id } = req.params;
    const idStr = Array.isArray(id) ? id[0] : id;

    if (!userIdStr) {
      return responses.unauthorized(res);
    }

    const notification = await prisma.notification.findUnique({
      where: { id: idStr },
    });

    if (!notification) {
      return responses.notFound(res, 'Notification not found');
    }

    if (notification.userId !== userIdStr) {
      return responses.forbidden(res);
    }

    await prisma.notification.delete({ where: { id: idStr } });
    return responses.ok(res, 'Notification deleted');
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/notifications/unread/count
 * Get unread notification count
 */
export async function getUnreadCount(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    const userIdStr = Array.isArray(userId) ? userId[0] : userId;

    if (!userIdStr) {
      return responses.unauthorized(res);
    }

    const count = await prisma.notification.count({
      where: { userId: userIdStr, isRead: false },
    });

    return responses.ok(res, 'Unread count', { count });
  } catch (error) {
    next(error);
  }
}