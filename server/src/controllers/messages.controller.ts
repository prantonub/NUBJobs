import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { responses, sendError } from '../utils/response.utils';
import { emitToUser, isUserOnline } from '../lib/socket-server';

export interface AuthRequest extends Request {
  userId?: string;
  email?: string;
  role?: string;
}

// ============================================
// Shared helpers (direct messaging)
// ============================================

/** Canonical pair ordering — one Conversation row per user pair. */
function canonicalPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

/** Which side of the conversation `userId` is (drives per-user flags). */
function sideOf(conv: { user1Id: string }, userId: string): 'user1' | 'user2' {
  return conv.user1Id === userId ? 'user1' : 'user2';
}

/**
 * Find or create the conversation between two users.
 * @param jobId optional job context to attach on first creation.
 */
async function findOrCreateConversation(userA: string, userB: string, jobId?: string | null) {
  const [user1Id, user2Id] = canonicalPair(userA, userB);
  const existing = await prisma.conversation.findUnique({
    where: { user1Id_user2Id: { user1Id, user2Id } },
  });
  if (existing) return existing;
  return prisma.conversation.create({
    data: { user1Id, user2Id, jobId: jobId ?? undefined },
  });
}

/** Load a conversation where `userId` is one of the two participants, or null. */
async function findConversationWith(userId: string, otherId: string) {
  const [user1Id, user2Id] = canonicalPair(userId, otherId);
  return prisma.conversation.findUnique({
    where: { user1Id_user2Id: { user1Id, user2Id } },
  });
}

/**
 * Block check per spec: neither side may have blocked the other.
 * Returns 'blocked_by_other' | 'you_blocked_them' | null.
 */
async function blockState(a: string, b: string): Promise<'blocked_by_other' | 'you_blocked_them' | null> {
  const rows = await prisma.blockedUser.findMany({
    where: {
      OR: [
        { blockerId: a, blockedId: b },
        { blockerId: b, blockedId: a },
      ],
    },
    select: { blockerId: true },
  });
  if (rows.some((r) => r.blockerId === a)) return 'you_blocked_them';
  if (rows.length > 0) return 'blocked_by_other';
  return null;
}

// Per-user send rate limit: 100 messages / 60s (spec §POST /send).
const sendWindow = new Map<string, { count: number; resetAt: number }>();
function rateLimited(userId: string, max = 100, windowMs = 60_000): number | null {
  const now = Date.now();
  const rec = sendWindow.get(userId);
  if (!rec || now > rec.resetAt) {
    sendWindow.set(userId, { count: 1, resetAt: now + windowMs });
    return null;
  }
  if (rec.count >= max) return Math.ceil((rec.resetAt - now) / 1000);
  rec.count += 1;
  return null;
}

/** API shape for one message (spec §GET conversation history). */
function formatMessage(msg: any, sender?: { name: string; avatarUrl: string | null } | null) {
  return {
    id: msg.id,
    senderId: msg.senderId,
    ...(msg.recipientId ? { recipientId: msg.recipientId } : {}),
    senderName: sender?.name ?? msg.sender?.name ?? null,
    senderPhoto: sender?.avatarUrl ?? msg.sender?.avatarUrl ?? null,
    content: msg.isDeleted ? null : msg.content,
    timestamp: msg.createdAt,
    isRead: msg.isRead,
    readAt: msg.readAt ?? null,
    isDeleted: msg.isDeleted,
  };
}

/** The other participant's public profile fields. */
const otherUserSelect = {
  id: true,
  name: true,
  avatarUrl: true,
  role: true,
  email: true,
} as const;

/**
 * Push `new_message` to the recipient's personal room and create a DB +
 * socket notification when they are offline (spec §POST /send side effects).
 */
async function deliverToRecipient(message: any, senderName: string) {
  emitToUser(message.recipientId, 'new_message', {
    message: {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      recipientId: message.recipientId,
      content: message.content,
      timestamp: message.createdAt,
      isRead: false,
    },
    sender: { id: message.senderId, name: senderName },
    timestamp: message.createdAt,
  });

  if (!isUserOnline(message.recipientId)) {
    const notification = await prisma.notification
      .create({
        data: {
          userId: message.recipientId,
          type: 'NEW_MESSAGE',
          message: `New message from ${senderName}`,
          link: `/messages?user=${message.senderId}`,
        },
      })
      .catch(() => null);
    if (notification) {
      emitToUser(message.recipientId, 'notification', {
        type: 'NEW_MESSAGE',
        message: `New message from ${senderName}`,
        data: { messageId: message.id, senderId: message.senderId },
      });
    }
  }
}

/**
 * Unified-inbox row: either a direct Conversation ('direct') or a legacy
 * application thread ('application').
 */
interface InboxItem {
  id: string; // direct → conversation id; legacy → `app:<applicationId>`
  kind: 'direct' | 'application';
  applicationId: string | null;
  otherUserId: string;
  otherUserName: string;
  otherUserPhoto: string | null;
  otherUserRole: string;
  lastMessage: string | null;
  lastMessageTime: string;
  unreadCount: number;
  jobId: string | null;
  jobTitle: string | null;
  isArchived: boolean;
  isPinned: boolean;
  blocked: boolean;
}

/**
 * Legacy application threads (student <-> employer chats tied to a job
 * application). These predate the Conversation model and must stay visible in
 * the same inbox — otherwise years of existing chats "disappear".
 */
async function legacyApplicationThreads(userId: string, search: string): Promise<InboxItem[]> {
  const [student, employer] = await Promise.all([
    prisma.studentProfile.findUnique({ where: { userId }, select: { id: true } }),
    prisma.employerProfile.findUnique({ where: { userId }, select: { id: true } }),
  ]);
  if (!student && !employer) return [];

  const matches = (hay: Array<string | null | undefined>) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return hay.some((h) => (h ?? '').toLowerCase().includes(q));
  };

  const rows: InboxItem[] = [];

  if (student) {
    const apps = await prisma.application.findMany({
      where: { studentId: student.id },
      include: {
        messages: {
          where: { isDeleted: false },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { content: true, createdAt: true },
        },
        job: {
          select: {
            id: true,
            title: true,
            employer: {
              select: {
                userId: true,
                companyName: true,
                logoUrl: true,
                user: { select: { name: true, email: true, avatarUrl: true, role: true } },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
    const unread = new Map<string, number>();
    if (apps.length > 0) {
      const groups = await prisma.message.groupBy({
        by: ['applicationId'],
        where: {
          applicationId: { in: apps.map((a) => a.id) },
          senderId: { not: userId },
          isRead: false,
          isDeleted: false,
        },
        _count: { _all: true },
      });
      for (const g of groups) if (g.applicationId) unread.set(g.applicationId, g._count._all);
    }
    for (const app of apps) {
      const emp = app.job.employer;
      const last = app.messages[0];
      const lastMessage = last?.content ?? null;
      if (!matches([emp.user.name, emp.user.email, emp.companyName, lastMessage, app.job.title])) continue;
      rows.push({
        id: `app:${app.id}`,
        kind: 'application',
        applicationId: app.id,
        otherUserId: emp.userId,
        otherUserName: emp.companyName || emp.user.name,
        otherUserPhoto: emp.logoUrl || emp.user.avatarUrl,
        otherUserRole: String(emp.user.role),
        lastMessage,
        lastMessageTime: (last?.createdAt ?? app.updatedAt).toISOString(),
        unreadCount: unread.get(app.id) ?? 0,
        jobId: app.job.id,
        jobTitle: app.job.title,
        isArchived: false,
        isPinned: false,
        blocked: false,
      });
    }
  }

  if (employer) {
    const apps = await prisma.application.findMany({
      where: { job: { employerId: employer.id } },
      include: {
        messages: {
          where: { isDeleted: false },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { content: true, createdAt: true },
        },
        job: { select: { id: true, title: true } },
        student: {
          select: {
            photoUrl: true,
            user: { select: { id: true, name: true, email: true, avatarUrl: true, role: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
    const unread = new Map<string, number>();
    if (apps.length > 0) {
      const groups = await prisma.message.groupBy({
        by: ['applicationId'],
        where: {
          applicationId: { in: apps.map((a) => a.id) },
          senderId: { not: userId },
          isRead: false,
          isDeleted: false,
        },
        _count: { _all: true },
      });
      for (const g of groups) if (g.applicationId) unread.set(g.applicationId, g._count._all);
    }
    for (const app of apps) {
      const stu = app.student;
      const last = app.messages[0];
      const lastMessage = last?.content ?? null;
      if (!matches([stu.user.name, stu.user.email, lastMessage, app.job.title])) continue;
      rows.push({
        id: `app:${app.id}`,
        kind: 'application',
        applicationId: app.id,
        otherUserId: stu.user.id,
        otherUserName: stu.user.name,
        otherUserPhoto: stu.photoUrl || stu.user.avatarUrl,
        otherUserRole: String(stu.user.role),
        lastMessage,
        lastMessageTime: (last?.createdAt ?? app.updatedAt).toISOString(),
        unreadCount: unread.get(app.id) ?? 0,
        jobId: app.job.id,
        jobTitle: app.job.title,
        isArchived: false,
        isPinned: false,
        blocked: false,
      });
    }
  }

  return rows;
}

// ============================================
// 1. GET /api/messages/conversations
// ============================================

export async function getConversations(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    if (!userId) return responses.unauthorized(res);

    const page = Math.max(1, parseInt(String(req.query.page ?? '1')) || 1);
    const limit = Math.max(1, Math.min(50, parseInt(String(req.query.limit ?? '20')) || 20));
    const search = String(req.query.search ?? '').trim();
    // Tabs: all (default) | unread | archived | pinned
    const filter = String(req.query.filter ?? 'all');

    const where: any = {
      OR: [{ user1Id: userId }, { user2Id: userId }],
    };
    if (search) {
      where.AND = [
        {
          OR: [
            { user1: { name: { contains: search, mode: 'insensitive' } } },
            { user2: { name: { contains: search, mode: 'insensitive' } } },
            { user1: { email: { contains: search, mode: 'insensitive' } } },
            { user2: { email: { contains: search, mode: 'insensitive' } } },
            { lastMessage: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const all = await prisma.conversation.findMany({
      where,
      include: {
        user1: { select: otherUserSelect },
        user2: { select: otherUserSelect },
        job: { select: { id: true, title: true } },
      },
      orderBy: { lastMessageTime: 'desc' },
    });

    const decorated = await Promise.all(
      all.map(async (conv) => {
        const mine = sideOf(conv, userId);
        const other = mine === 'user1' ? conv.user1 : conv.user2;
        const unreadCount = await prisma.message.count({
          where: {
            conversationId: conv.id,
            recipientId: userId,
            isRead: false,
            isDeleted: false,
          },
        });
        return {
          id: conv.id,
          kind: 'direct' as const,
          applicationId: null as string | null,
          otherUserId: other.id,
          otherUserName: other.name,
          otherUserPhoto: other.avatarUrl,
          otherUserRole: other.role,
          lastMessage: conv.lastMessage,
          lastMessageTime: conv.lastMessageTime.toISOString(),
          unreadCount,
          jobId: conv.job?.id ?? null,
          jobTitle: conv.job?.title ?? null,
          isArchived: mine === 'user1' ? conv.user1Archived : conv.user2Archived,
          isPinned: mine === 'user1' ? conv.user1Pinned : conv.user2Pinned,
          blocked: mine === 'user1' ? conv.user1BlockedUser2 : conv.user2BlockedUser1,
        };
      })
    );

    // Unified inbox: direct conversations PLUS legacy application threads.
    // (The legacy threads are why "old chats disappear" — they predate the
    // Conversation model and a direct-only list can never show them.)
    const legacy = await legacyApplicationThreads(userId, search);

    let list: InboxItem[] = [...decorated, ...legacy];
    if (filter === 'archived') list = list.filter((c) => c.isArchived);
    else if (filter === 'pinned') list = list.filter((c) => c.isPinned && !c.isArchived);
    else if (filter === 'unread') list = list.filter((c) => c.unreadCount > 0 && !c.isArchived);
    else list = list.filter((c) => !c.isArchived); // 'all' hides archived

    // Pinned first, then most recent.
    list.sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || b.lastMessageTime.localeCompare(a.lastMessageTime));

    const total = list.length;
    const start = (page - 1) * limit;
    const conversations = list.slice(start, start + limit);

    return responses.ok(res, 'Conversations retrieved', {
      conversations,
      pagination: { page, limit, total },
    });
  } catch (error) {
    next(error);
  }
}

// ============================================
// 2. GET /api/messages/conversation/:userId
// ============================================

/**
 * Legacy application-scoped thread. ApplicationChat reads `data.data` as a
 * bare array of `{ id, content, createdAt, senderId, sender }`, so this path
 * must keep that exact shape — only the direct-messaging branch (a real User
 * id) returns the spec's `{ otherUser, job, messages, pagination }` envelope.
 */
async function getApplicationThread(req: AuthRequest, res: Response, applicationId: string) {
  const userId = req.userId!;
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      student: { include: { user: { select: { id: true, name: true, email: true } } } },
      job: { include: { employer: { select: { userId: true } } } },
    },
  });
  if (!application) return responses.notFound(res, 'Application not found');
  const isStudent = application.student.user.id === userId;
  const isEmployer = application.job.employer.userId === userId;
  if (!isStudent && !isEmployer) return responses.forbidden(res);

  const messages = await prisma.message.findMany({
    where: { applicationId, isDeleted: false },
    orderBy: { createdAt: 'asc' },
    include: { sender: { select: { id: true, name: true, email: true } } },
  });

  // Auto-mark messages as read for current user (legacy behavior)
  await prisma.message.updateMany({
    where: { applicationId, senderId: { not: userId }, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });

  return responses.ok(res, 'Messages retrieved', messages);
}

export async function getConversation(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    const otherId = String(req.params.userId ?? '');
    if (!userId) return responses.unauthorized(res);
    if (!otherId) return responses.badRequest(res, 'User id is required');

    // Dispatch: a User id → direct-messaging history (spec); otherwise fall
    // back to the legacy Application thread that also lives on this path.
    const otherUser = await prisma.user.findUnique({
      where: { id: otherId },
      select: otherUserSelect,
    });
    if (!otherUser) return getApplicationThread(req, res, otherId);
    if (otherId === userId) return responses.badRequest(res, 'Cannot open a conversation with yourself');

    const blocked = await blockState(userId, otherId);
    if (blocked === 'blocked_by_other') return responses.forbidden(res, 'You cannot view this conversation');

    const conv = await findOrCreateConversation(userId, otherId);

    const page = Math.max(1, parseInt(String(req.query.page ?? '1')) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(String(req.query.limit ?? '30')) || 30));

    const rows = await prisma.message.findMany({
      where: { conversationId: conv.id, isDeleted: false },
      orderBy: { createdAt: 'desc' },
      // Cursor pagination: everything older than `cursor` (message id).
      ...(req.query.cursor
        ? { cursor: { id: String(req.query.cursor) }, skip: 1 }
        : { skip: (page - 1) * limit }),
      take: limit + 1, // probe for hasMore
      include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
    });
    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const messages = pageRows.reverse(); // oldest → newest for rendering

    const job = conv.jobId
      ? await prisma.job.findUnique({
          where: { id: conv.jobId },
          select: { id: true, title: true, employer: { select: { companyName: true } } },
        })
      : null;

    return responses.ok(res, 'Conversation retrieved', {
      otherUser: {
        id: otherUser.id,
        name: otherUser.name,
        photo: otherUser.avatarUrl,
        role: otherUser.role,
        email: otherUser.email,
      },
      job: job ? { id: job.id, title: job.title, company: job.employer.companyName } : null,
      messages: messages.map((m) => formatMessage(m)),
      pagination: {
        hasMore,
        cursor: hasMore ? messages[0]?.id ?? null : null,
        page,
        limit,
      },
    });
  } catch (error) {
    next(error);
  }
}

// ============================================
// 3. POST /api/messages/send (spec) + legacy POST /api/messages
// ============================================

/** Shared send pipeline for both routes. */
async function processSend(
  req: AuthRequest,
  res: Response,
  payload: { recipientId?: string; applicationId?: string; content: string; jobId?: string }
) {
  const senderId = req.userId;
  if (!senderId) return responses.unauthorized(res);

  const content = String(payload.content ?? '').trim();
  if (!content) return responses.badRequest(res, 'Message content cannot be empty');
  if (content.length > 5000) return responses.badRequest(res, 'Message content must be at most 5000 characters');

  const resetIn = rateLimited(senderId);
  if (resetIn !== null) {
    res.set('Retry-After', String(resetIn));
    return sendError(res, 429, 'Too many messages', `Please slow down — try again in ${resetIn}s`);
  }

  // ── Legacy application thread (POST /messages, ApplicationChat) ──
  if (payload.applicationId) {
    const application = await prisma.application.findUnique({
      where: { id: payload.applicationId },
      include: {
        student: { select: { userId: true } },
        job: { include: { employer: { select: { userId: true } } } },
      },
    });
    if (!application) return responses.notFound(res, 'Application not found');
    const isStudent = application.student.userId === senderId;
    const isEmployer = application.job.employer.userId === senderId;
    if (!isStudent && !isEmployer) return responses.forbidden(res);
    const recipientId = isStudent ? application.job.employer.userId : application.student.userId;

    const message = await prisma.message.create({
      data: { applicationId: payload.applicationId, senderId, recipientId, content },
      include: { sender: { select: { id: true, name: true, email: true } } },
    });
    emitToUser(recipientId, 'new_message', {
      applicationId: payload.applicationId,
      message,
    });
    return responses.created(res, 'Message sent', message);
  }

  // ── Direct messaging (POST /messages/send) ──
  const recipientId = String(payload.recipientId ?? '');
  if (!recipientId) return responses.badRequest(res, 'recipientId is required');
  if (recipientId === senderId) return responses.badRequest(res, 'Cannot message yourself');

  const recipient = await prisma.user.findUnique({
    where: { id: recipientId },
    select: { id: true, name: true, isBanned: true },
  });
  if (!recipient) return responses.notFound(res, 'Recipient not found');

  const blocked = await blockState(senderId, recipientId);
  if (blocked === 'you_blocked_them')
    return responses.forbidden(res, 'Unblock this user before messaging them');
  if (blocked === 'blocked_by_other')
    return responses.forbidden(res, 'You cannot message this user');

  const conv = await findOrCreateConversation(senderId, recipientId, payload.jobId ?? null);

  const message = await prisma.message.create({
    data: { conversationId: conv.id, senderId, recipientId, content, isRead: false },
    include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
  });

  await prisma.conversation.update({
    where: { id: conv.id },
    data: { lastMessage: content.slice(0, 500), lastMessageTime: message.createdAt },
  });

  const sender = await prisma.user.findUnique({ where: { id: senderId }, select: { name: true } });
  await deliverToRecipient(message, sender?.name ?? 'Someone');

  return responses.created(res, 'Message sent', {
    message: {
      id: message.id,
      senderId: message.senderId,
      recipientId: message.recipientId,
      content: message.content,
      timestamp: message.createdAt,
      isRead: false,
    },
  });
}

export async function sendMessage(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    return await processSend(req, res, req.body);
  } catch (error) {
    next(error);
  }
}

/** POST /api/messages/send — spec route (recipientId + optional jobId). */
export async function sendDirectMessage(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    return await processSend(req, res, req.body);
  } catch (error) {
    next(error);
  }
}

// ============================================
// 4. PATCH /api/messages/:messageId/read
// ============================================

export async function markMessageRead(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    const messageId = String(req.params.messageId ?? req.params.id ?? '');
    if (!userId) return responses.unauthorized(res);

    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) return responses.notFound(res, 'Message not found');
    // Spec: only the recipient may mark a message read.
    if (message.recipientId && message.recipientId !== userId) return responses.forbidden(res);
    if (!message.recipientId && message.senderId === userId) return responses.forbidden(res);

    const updated = message.isRead
      ? message
      : await prisma.message.update({
          where: { id: messageId },
          data: { isRead: true, readAt: new Date() },
        });

    emitToUser(message.senderId, 'message_read', {
      messageId,
      conversationId: message.conversationId,
      readAt: updated.readAt,
    });

    return responses.ok(res, 'Message marked as read', { success: true });
  } catch (error) {
    next(error);
  }
}

// ============================================
// 5. PATCH /api/messages/conversation/:userId/read-all
// ============================================

export async function markConversationRead(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    const otherId = String(req.params.userId ?? '');
    if (!userId) return responses.unauthorized(res);

    const conv = await findConversationWith(userId, otherId);
    if (!conv) return responses.notFound(res, 'Conversation not found');

    await prisma.message.updateMany({
      where: { conversationId: conv.id, recipientId: userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    // Tell the other side their receipts flipped (spec side effect).
    const otherUserId = conv.user1Id === userId ? conv.user2Id : conv.user1Id;
    emitToUser(otherUserId, 'conversation_read', {
      conversationId: conv.id,
      readBy: userId,
      readAt: new Date(),
    });

    return responses.ok(res, 'Conversation marked as read', { success: true });
  } catch (error) {
    next(error);
  }
}

// ============================================
// 6. DELETE /api/messages/:messageId (soft delete, sender only)
// ============================================

export async function deleteMessage(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    const messageId = String(req.params.messageId ?? req.params.id ?? '');
    if (!userId) return responses.unauthorized(res);

    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) return responses.notFound(res, 'Message not found');
    if (message.senderId !== userId) return responses.forbidden(res, 'You can only delete your own messages');

    // Soft delete — keep the row for the audit trail (spec).
    await prisma.message.update({ where: { id: messageId }, data: { isDeleted: true } });

    // Notify BOTH parties so the bubble disappears on every open tab.
    const otherUserId = message.recipientId;
    if (otherUserId) {
      emitToUser(otherUserId, 'message_deleted', {
        messageId,
        conversationId: message.conversationId,
      });
    }
    emitToUser(userId, 'message_deleted', {
      messageId,
      conversationId: message.conversationId,
    });

    return responses.ok(res, 'Message deleted', { success: true });
  } catch (error) {
    next(error);
  }
}

// ============================================
// 7. GET /api/messages/search
// ============================================

export async function searchMessages(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    if (!userId) return responses.unauthorized(res);

    const keyword = String(req.query.keyword ?? '').trim();
    const filterUserId = String(req.query.userId ?? '').trim();
    const dateFrom = String(req.query.dateFrom ?? '').trim();
    const dateTo = String(req.query.dateTo ?? '').trim();
    const unreadOnly = String(req.query.unreadOnly ?? '') === 'true';
    const page = Math.max(1, parseInt(String(req.query.page ?? '1')) || 1);
    const limit = Math.max(1, Math.min(50, parseInt(String(req.query.limit ?? '20')) || 20));

    // Only the caller's own direct messages, never soft-deleted ones.
    const where: any = {
      conversationId: { not: null },
      OR: [{ senderId: userId }, { recipientId: userId }],
      isDeleted: false,
    };
    if (keyword) where.content = { contains: keyword, mode: 'insensitive' };
    if (unreadOnly) where.isRead = false;
    if (filterUserId) where.AND = [{ senderId: filterUserId }, { recipientId: userId }];
    if (dateFrom || dateTo) {
      where.createdAt = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(`${dateTo}T23:59:59.999Z`) } : {}),
      };
    }

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          sender: { select: { id: true, name: true, avatarUrl: true } },
          recipient: { select: { id: true, name: true, avatarUrl: true } },
          conversation: { include: { user1: { select: otherUserSelect }, user2: { select: otherUserSelect } } },
        },
      }),
      prisma.message.count({ where }),
    ]);

    const results = messages.map((m) => {
      const conv = m.conversation;
      const other = conv ? (conv.user1Id === userId ? conv.user2 : conv.user1) : null;
      return {
        ...formatMessage(m),
        otherUserId: other?.id ?? null,
        otherUserName: other?.name ?? null,
        conversationId: m.conversationId,
      };
    });

    return responses.ok(res, 'Search results', {
      messages: results,
      pagination: { page, limit, total },
    });
  } catch (error) {
    next(error);
  }
}

// ============================================
// 8-10. archive / unarchive / pin
// ============================================

/** Shared impl for the per-user conversation flag PATCHes. */
async function setConversationFlag(
  req: AuthRequest,
  res: Response,
  flag: 'archived' | 'pinned',
  value: boolean
) {
  const userId = req.userId;
  const otherId = String(req.params.userId ?? '');
  if (!userId) return responses.unauthorized(res);

  const conv = await findConversationWith(userId, otherId);
  if (!conv) return responses.notFound(res, 'Conversation not found');

  const side = sideOf(conv, userId);
  const data =
    flag === 'archived'
      ? { [`${side}Archived`]: value }
      : { [`${side}Pinned`]: value };
  await prisma.conversation.update({ where: { id: conv.id }, data });

  if (flag === 'archived') {
    // Spec side effect: the other party learns the thread was archived.
    const otherUserId = side === 'user1' ? conv.user2Id : conv.user1Id;
    emitToUser(otherUserId, 'conversation_archived', {
      conversationId: conv.id,
      archived: value,
    });
  }

  return responses.ok(res, `Conversation ${flag === 'archived' ? (value ? 'archived' : 'unarchived') : value ? 'pinned' : 'unpinned'}`, {
    success: true,
  });
}

export async function archiveConversation(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    return await setConversationFlag(req, res, 'archived', true);
  } catch (error) {
    next(error);
  }
}

export async function unarchiveConversation(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    return await setConversationFlag(req, res, 'archived', false);
  } catch (error) {
    next(error);
  }
}

export async function pinConversation(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const isPinned = req.body?.isPinned !== false; // default true
    return await setConversationFlag(req, res, 'pinned', isPinned);
  } catch (error) {
    next(error);
  }
}

// ============================================
// 11. GET /api/messages/unread-count
// ============================================

export async function getUnreadCount(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    if (!userId) return responses.unauthorized(res);

    const unreadCount = await prisma.message.count({
      where: { recipientId: userId, isRead: false, isDeleted: false, conversationId: { not: null } },
    });
    return responses.ok(res, 'Unread count', { unreadCount });
  } catch (error) {
    next(error);
  }
}

/**
 * Auxiliary: recipient auto-complete for /messages/new (spec §FRONTEND PAGE 2
 * "Search for recipient"). Authenticated, but never admin-only — students and
 * employers need it to start threads. Returns the opposite role by default so
 * students find employers and vice versa.
 */
export async function searchRecipients(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    if (!userId) return responses.unauthorized(res);

    const q = String(req.query.q ?? req.query.search ?? '').trim();
    const roleFilter = String(req.query.role ?? '').trim();

    const me = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    // Default: only show the other side of the marketplace (STUDENT <-> EMPLOYER).
    const defaultRole = me?.role === 'EMPLOYER' ? 'STUDENT' : 'EMPLOYER';

    const where: any = {
      id: { not: userId },
      isBanned: false,
      role: (roleFilter || defaultRole) as any,
    };
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, role: true, avatarUrl: true },
      orderBy: { name: 'asc' },
      take: 15,
    });

    return responses.ok(res, 'Recipients', {
      recipients: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        photo: u.avatarUrl,
      })),
    });
  } catch (error) {
    next(error);
  }
}

// ============================================
// 12. GET /api/messages/typing/:userId
// ============================================
export async function emitTypingIndicator(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    const otherId = String(req.params.userId ?? '');
    if (!userId) return responses.unauthorized(res);
    if (!otherId) return responses.badRequest(res, 'User id is required');

    const blocked = await blockState(userId, otherId);
    if (blocked) return responses.forbidden(res, 'You cannot notify this user');

    const sender = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    emitToUser(otherId, 'typing_indicator', { senderId: userId, senderName: sender?.name ?? 'Someone' });
    return responses.ok(res, 'Typing indicator sent', { success: true });
  } catch (error) {
    next(error);
  }
}

// ============================================
// 13-15. block / unblock / blocked list
// ============================================

export async function blockUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    const targetId = String(req.params.userId ?? '');
    if (!userId) return responses.unauthorized(res);
    if (!targetId || targetId === userId) return responses.badRequest(res, 'Invalid user id');

    const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true } });
    if (!target) return responses.notFound(res, 'User not found');

    await prisma.blockedUser.upsert({
      where: { blockerId_blockedId: { blockerId: userId, blockedId: targetId } },
      create: { blockerId: userId, blockedId: targetId },
      update: {},
    });

    // Mirror onto the conversation row for fast thread-level checks.
    const conv = await findConversationWith(userId, targetId);
    if (conv) {
      const side = sideOf(conv, userId);
      await prisma.conversation.update({
        where: { id: conv.id },
        data: side === 'user1' ? { user1BlockedUser2: true } : { user2BlockedUser1: true },
      });
    }

    emitToUser(targetId, 'user_blocked', { blockedBy: userId });
    return responses.ok(res, 'User blocked', { success: true });
  } catch (error) {
    next(error);
  }
}

export async function unblockUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    const targetId = String(req.params.userId ?? '');
    if (!userId) return responses.unauthorized(res);

    await prisma.blockedUser.deleteMany({ where: { blockerId: userId, blockedId: targetId } });

    const conv = await findConversationWith(userId, targetId);
    if (conv) {
      const side = sideOf(conv, userId);
      await prisma.conversation.update({
        where: { id: conv.id },
        data: side === 'user1' ? { user1BlockedUser2: false } : { user2BlockedUser1: false },
      });
    }

    emitToUser(targetId, 'user_unblocked', { unblockedBy: userId });
    return responses.ok(res, 'User unblocked', { success: true });
  } catch (error) {
    next(error);
  }
}

export async function getBlockedUsers(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    if (!userId) return responses.unauthorized(res);

    const rows = await prisma.blockedUser.findMany({
      where: { blockerId: userId },
      orderBy: { createdAt: 'desc' },
      include: { blocked: { select: otherUserSelect } },
    });

    return responses.ok(res, 'Blocked users', {
      blockedUsers: rows.map((r) => ({
        userId: r.blocked.id,
        name: r.blocked.name,
        photo: r.blocked.avatarUrl,
        role: r.blocked.role,
        reason: r.reason,
        blockedAt: r.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    next(error);
  }
}






