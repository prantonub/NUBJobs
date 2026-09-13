import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { responses } from '../utils/response.utils';

export interface AuthRequest extends Request {
  userId?: string;
  email?: string;
  role?: string;
}

/**
 * GET /api/notifications
 * Get all notifications for current user
 */
export async function getNotifications(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    const { page = 1, limit = 20, unreadOnly = false } = req.query;

    if (!userId) {
      return responses.unauthorized(res);
    }

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const pageSize = Math.max(1, Math.min(50, parseInt(limit as string) || 20));
    const skip = (pageNum - 1) * pageSize;

    const where: any = { userId };
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

    return responses.ok(res, 'Notifications', {
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
 * PATCH /api/notifications/:id/read
 * Mark notification as read
 */
export async function markAsRead(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!userId) {
      return responses.unauthorized(res);
    }

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      return responses.notFound(res, 'Notification not found');
    }

    if (notification.userId !== userId) {
      return responses.forbidden(res);
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    return responses.ok(res, 'Marked as read', updated);
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/notifications/mark-all-read
 * Mark all notifications as read
 */
export async function markAllAsRead(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;

    if (!userId) {
      return responses.unauthorized(res);
    }

    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return responses.ok(res, 'All marked as read');
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 */
export async function deleteNotification(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!userId) {
      return responses.unauthorized(res);
    }

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      return responses.notFound(res, 'Notification not found');
    }

    if (notification.userId !== userId) {
      return responses.forbidden(res);
    }

    await prisma.notification.delete({ where: { id } });

    return responses.ok(res, 'Notification deleted');
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/notifications/unread-count
 * Get count of unread notifications
 */
export async function getUnreadCount(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;

    if (!userId) {
      return responses.unauthorized(res);
    }

    const count = await prisma.notification.count({
      where: { userId, isRead: false },
    });

    return responses.ok(res, 'Unread count', { unreadCount: count });
  } catch (error) {
    next(error);
  }
}