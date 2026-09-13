import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { responses } from '../utils/response.utils';

export interface AuthRequest extends Request {
  userId?: string;
  email?: string;
  role?: string;
}

/**
 * GET /api/messages/conversations
 * Get all conversations for current user
 */
export async function getConversations(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    const { page = 1, limit = 20 } = req.query;

    if (!userId) {
      return responses.unauthorized(res);
    }

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const pageSize = Math.max(1, Math.min(50, parseInt(limit as string) || 20));
    const skip = (pageNum - 1) * pageSize;

    // Get applications where user is involved
    const applications = await prisma.application.findMany({
      where: {
        OR: [
          { student: { userId } },
          { job: { employer: { userId } } },
        ],
      },
      include: {
        student: { select: { user: { select: { id: true, name: true, email: true } } } },
        job: { include: { employer: { select: { userId: true, companyName: true } } } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { messages: { _count: 'desc' } },
      skip,
      take: pageSize,
    });

    const conversations = applications.map((app) => {
      const isStudent = app.student.userId === userId;
      const otherParty = isStudent
        ? {
            name: app.job.employer.companyName,
            avatar: app.job.employer.logoUrl,
            email: '',
          }
        : {
            name: app.student.user.name,
            avatar: app.student.photoUrl,
            email: app.student.user.email,
          };

      return {
        id: app.id,
        jobTitle: app.job.title,
        lastMessage: app.messages[0]?.content || 'No messages yet',
        lastMessageTime: app.messages[0]?.createdAt || app.createdAt,
        unreadCount: app.messages.filter((m) => !m.isRead && m.senderId !== userId).length,
        otherParty,
      };
    });

    return responses.ok(res, 'Conversations', conversations);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/messages/conversation/:applicationId
 * Get messages for an application (conversation)
 */
export async function getConversation(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { applicationId } = req.params;
    const userId = req.userId;
    const { page = 1, limit = 50 } = req.query;

    if (!userId) {
      return responses.unauthorized(res);
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        student: { select: { userId: true } },
        job: { include: { employer: { select: { userId: true } } } },
      },
    });

    if (!application) {
      return responses.notFound(res, 'Conversation not found');
    }

    // Check access
    const isStudent = application.student.userId === userId;
    const isEmployer = application.job.employer.userId === userId;

    if (!isStudent && !isEmployer) {
      return responses.forbidden(res);
    }

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const pageSize = Math.max(1, Math.min(100, parseInt(limit as string) || 50));
    const skip = (pageNum - 1) * pageSize;

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: { applicationId },
        include: {
          sender: { select: { id: true, name: true, photoUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.message.count({ where: { applicationId } }),
    ]);

    // Mark messages as read
    await prisma.message.updateMany({
      where: {
        applicationId,
        senderId: { not: userId },
        isRead: false,
      },
      data: { isRead: true },
    });

    return responses.ok(res, 'Conversation messages', {
      data: messages.reverse(),
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
 * POST /api/messages/send
 * Send a message in an application
 */
export async function sendMessage(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    const { applicationId, content } = req.body;

    if (!userId) {
      return responses.unauthorized(res);
    }

    if (!content || !applicationId) {
      return responses.badRequest(res, 'Missing required fields');
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        student: { select: { userId: true } },
        job: { include: { employer: { select: { userId: true } } } },
      },
    });

    if (!application) {
      return responses.notFound(res, 'Conversation not found');
    }

    // Check access
    const isStudent = application.student.userId === userId;
    const isEmployer = application.job.employer.userId === userId;

    if (!isStudent && !isEmployer) {
      return responses.forbidden(res);
    }

    const message = await prisma.message.create({
      data: {
        applicationId,
        senderId: userId,
        content,
      },
      include: {
        sender: { select: { id: true, name: true, photoUrl: true } },
      },
    });

    // TODO: Emit via Socket.io for real-time update
    // TODO: Create notification for other party

    return responses.created(res, 'Message sent', message);
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/messages/:id/read
 * Mark message as read
 */
export async function markMessageRead(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!userId) {
      return responses.unauthorized(res);
    }

    const message = await prisma.message.findUnique({
      where: { id },
    });

    if (!message) {
      return responses.notFound(res, 'Message not found');
    }

    const updated = await prisma.message.update({
      where: { id },
      data: { isRead: true },
    });

    return responses.ok(res, 'Message marked as read', updated);
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/messages/:id
 * Delete a message
 */
export async function deleteMessage(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!userId) {
      return responses.unauthorized(res);
    }

    const message = await prisma.message.findUnique({
      where: { id },
    });

    if (!message) {
      return responses.notFound(res, 'Message not found');
    }

    if (message.senderId !== userId) {
      return responses.forbidden(res);
    }

    await prisma.message.delete({ where: { id } });

    return responses.ok(res, 'Message deleted');
  } catch (error) {
    next(error);
  }
}