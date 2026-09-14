import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { responses } from '../utils/response.utils';

export interface AuthRequest extends Request {
  userId?: string | string[];
  email?: string;
  role?: string;
}

/**
 * GET /api/messages/conversations
 * Get list of conversations
 */
export async function getConversations(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    const userIdStr = Array.isArray(userId) ? userId[0] : userId;

    if (!userIdStr) {
      return responses.unauthorized(res);
    }

    const { page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const pageSize = Math.max(1, Math.min(50, parseInt(limit as string) || 20));
    const skip = (pageNum - 1) * pageSize;

    // Get student profile to find applications
    const student = await prisma.studentProfile.findUnique({
      where: { userId: userIdStr },
      select: { id: true },
    });

    const where: any = {};

    if (student) {
      // Student: conversations from their applications
      where.application = {
        studentId: student.id,
      };
    } else {
      // Employer: conversations from their job applications
      const employer = await prisma.employerProfile.findUnique({
        where: { userId: userIdStr },
        select: { id: true },
      });

      if (employer) {
        where.application = {
          job: {
            employerId: employer.id,
          },
        };
      }
    }

    // Get conversations with last message
    const conversations = await prisma.application.findMany({
      where,
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        student: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        job: {
          include: {
            employer: { select: { userId: true, companyName: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: pageSize,
    });

    const total = await prisma.application.count({ where });

    const formattedConversations = conversations.map((conv) => ({
      id: conv.id,
      otherParty: {
        name: student ? conv.job.employer.companyName : conv.student.user.name,
        email: student
          ? conv.job.employer.userId
          : conv.student.user.email,
        avatar: null,
      },
      lastMessage:
        conv.messages.length > 0
          ? conv.messages[0].content.substring(0, 50)
          : 'No messages',
      unreadCount: 0,
    }));

    return responses.ok(res, 'Conversations retrieved', {
      data: formattedConversations,
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
 * GET /api/messages/:applicationId
 * Get messages for a conversation
 */
export async function getConversation(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    const userIdStr = Array.isArray(userId) ? userId[0] : userId;
    const { applicationId } = req.params;
    const appIdStr = Array.isArray(applicationId) ? applicationId[0] : applicationId;

    if (!userIdStr) {
      return responses.unauthorized(res);
    }

    const application = await prisma.application.findUnique({
      where: { id: appIdStr },
      include: {
        student: { select: { userId: true } },
        job: {
          include: {
            employer: { select: { userId: true } },
          },
        },
      },
    });

    if (!application) {
      return responses.notFound(res, 'Conversation not found');
    }

    // Check access
    const isStudent = application.student.userId === userIdStr;
    const isEmployer = application.job.employer.userId === userIdStr;

    if (!isStudent && !isEmployer) {
      return responses.forbidden(res);
    }

    // Get messages
    const messages = await prisma.message.findMany({
      where: { applicationId: appIdStr },
      include: {
        sender: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Auto-mark messages as read for current user
    await prisma.message.updateMany({
      where: { applicationId: appIdStr, senderId: { not: userIdStr } },
      data: { isRead: true },
    });

    return responses.ok(res, 'Messages retrieved', messages);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/messages
 * Send message
 */
export async function sendMessage(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    const userIdStr = Array.isArray(userId) ? userId[0] : userId;
    const { applicationId, content } = req.body;

    if (!userIdStr) {
      return responses.unauthorized(res);
    }

    if (!applicationId || !content) {
      return responses.badRequest(res, 'Application ID and content required');
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        student: { select: { userId: true } },
        job: {
          include: {
            employer: { select: { userId: true } },
          },
        },
      },
    });

    if (!application) {
      return responses.notFound(res, 'Application not found');
    }

    // Check access
    const isStudent = application.student.userId === userIdStr;
    const isEmployer = application.job.employer.userId === userIdStr;

    if (!isStudent && !isEmployer) {
      return responses.forbidden(res);
    }

    const message = await prisma.message.create({
      data: {
        applicationId,
        senderId: userIdStr,
        content,
        isRead: false,
      },
      include: {
        sender: { select: { id: true, name: true, email: true } },
      },
    });

    return responses.created(res, 'Message sent', message);
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/messages/:id/read
 * Mark message as read
 */
export async function markMessageRead(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    const userIdStr = Array.isArray(userId) ? userId[0] : userId;
    const { id } = req.params;
    const idStr = Array.isArray(id) ? id[0] : id;

    if (!userIdStr) {
      return responses.unauthorized(res);
    }

    const message = await prisma.message.findUnique({
      where: { id: idStr },
    });

    if (!message) {
      return responses.notFound(res, 'Message not found');
    }

    const updated = await prisma.message.update({
      where: { id: idStr },
      data: { isRead: true },
    });

    return responses.ok(res, 'Message marked as read', updated);
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/messages/:id
 * Delete message
 */
export async function deleteMessage(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    const userIdStr = Array.isArray(userId) ? userId[0] : userId;
    const { id } = req.params;
    const idStr = Array.isArray(id) ? id[0] : id;

    if (!userIdStr) {
      return responses.unauthorized(res);
    }

    const message = await prisma.message.findUnique({
      where: { id: idStr },
    });

    if (!message) {
      return responses.notFound(res, 'Message not found');
    }

    if (message.senderId !== userIdStr) {
      return responses.forbidden(res);
    }

    await prisma.message.delete({ where: { id: idStr } });
    return responses.ok(res, 'Message deleted');
  } catch (error) {
    next(error);
  }
}