import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { responses, sendError } from '../utils/response.utils';
import { emitToUser } from '../lib/socket-server';
import { notifySocial, parsePage, publicUserSelect, toPublicUser, PublicUserRow } from '../utils/social.utils';

/** Canonical pair ordering — matches the existing messaging system. */
const canonicalPair = (a: string, b: string): [string, string] => (a < b ? [a, b] : [b, a]);

async function findPairConversation(a: string, b: string) {
  return prisma.conversation.findFirst({
    where: { OR: [{ user1Id: a, user2Id: b }, { user1Id: b, user2Id: a }] },
  });
}

async function ensurePairConversation(a: string, b: string) {
  const existing = await findPairConversation(a, b);
  if (existing) return existing;
  const [user1Id, user2Id] = canonicalPair(a, b);
  return prisma.conversation.create({ data: { user1Id, user2Id } });
}

async function isBlockedPair(a: string, b: string): Promise<boolean> {
  const row = await prisma.blockedUser.findFirst({
    where: {
      OR: [
        { blockerId: a, blockedId: b },
        { blockerId: b, blockedId: a },
      ],
    },
    select: { id: true },
  });
  return Boolean(row);
}

/** GET /api/social/messages — my conversations, most recent first. */
export async function listConversations(req: AuthRequest, res: Response) {
  const me = req.userId!;
  const { page, limit, skip, take } = parsePage(req.query, 20);
  const search = String(req.query.search ?? '').trim().toLowerCase();

  const where = { OR: [{ user1Id: me }, { user2Id: me }] };
  const [convs, total] = await Promise.all([
    prisma.conversation.findMany({
      where,
      include: {
        user1: { select: publicUserSelect },
        user2: { select: publicUserSelect },
      },
      orderBy: { lastMessageTime: 'desc' },
      skip,
      take,
    }),
    prisma.conversation.count({ where }),
  ]);

  const items = await Promise.all(
    convs.map(async (conv) => {
      const other = (conv.user1Id === me ? conv.user2 : conv.user1) as PublicUserRow;
      const unreadCount = await prisma.message.count({
        where: { conversationId: conv.id, recipientId: me, isRead: false, isDeleted: false },
      });
      const isArchived = conv.user1Id === me ? conv.user1Archived : conv.user2Archived;
      const isPinned = conv.user1Id === me ? conv.user1Pinned : conv.user2Pinned;
      return {
        id: conv.id,
        otherUser: toPublicUser(other),
        lastMessage: conv.lastMessage,
        lastMessageTime: conv.lastMessageTime,
        unreadCount,
        isArchived,
        isPinned,
        jobId: conv.jobId,
      };
    })
  );
  const filtered = search
    ? items.filter((i) => i.otherUser.name?.toLowerCase().includes(search) || i.otherUser.username?.includes(search))
    : items;

  res.json({
    success: true,
    statusCode: 200,
    message: 'Conversations fetched',
    data: {
      conversations: filtered,
      pagination: { page, limit, total, hasMore: skip + convs.length < total },
    },
  });
}

/** GET /api/social/messages/:userId — DM history with one user (oldest first). */
export async function getHistory(req: AuthRequest, res: Response) {
  const me = req.userId!;
  const otherId = String(req.params.userId);
  const { page, limit, skip, take } = parsePage(req.query, 50);
  if (otherId === me) return responses.badRequest(res, 'Invalid conversation');

  const other = await prisma.user.findUnique({ where: { id: otherId }, select: publicUserSelect });
  if (!other) return responses.notFound(res, 'User not found');
  const conv = await findPairConversation(me, otherId);

  const where = conv
    ? { conversationId: conv.id }
    : {
        AND: [
          { OR: [{ senderId: me, recipientId: otherId }, { senderId: otherId, recipientId: me }] },
          { conversationId: null as any },
        ],
      };
  const [rows, total] = await Promise.all([
    prisma.message.findMany({
      where: { ...where, isDeleted: false },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.message.count({ where: { ...where, isDeleted: false } }),
  ]);
  const messages = rows.reverse().map((m) => ({
    id: m.id,
    senderId: m.senderId,
    recipientId: m.recipientId,
    content: m.content,
    photoUrl: m.photoUrl,
    isRead: m.isRead,
    readAt: m.readAt,
    createdAt: m.createdAt,
    isMine: m.senderId === me,
  }));
  res.json({
    success: true,
    statusCode: 200,
    message: 'Messages fetched',
    data: {
      otherUser: toPublicUser(other),
      messages,
      pagination: { page, limit, total, hasMore: skip + rows.length < total },
    },
  });
}

/** POST /api/social/messages/:userId — send a DM (content and/or photo). */
export async function sendMessage(req: AuthRequest, res: Response) {
  const me = req.userId!;
  const otherId = String(req.params.userId);
  const content = String(req.body?.content ?? '').trim();
  const photoUrl = req.body?.photoUrl ? String(req.body.photoUrl) : null;

  if (otherId === me) return responses.badRequest(res, 'You cannot message yourself');
  if (!content && !photoUrl) return responses.badRequest(res, 'Message content or photo is required');
  if (content.length > 500) return responses.badRequest(res, 'Message must be 500 characters or fewer');

  const other = await prisma.user.findUnique({ where: { id: otherId }, select: { id: true, name: true } });
  if (!other) return responses.notFound(res, 'User not found');
  if (await isBlockedPair(me, otherId)) return responses.forbidden(res, 'You cannot message this user');

  const conv = await ensurePairConversation(me, otherId);
  const message = await prisma.message.create({
    data: {
      conversationId: conv.id,
      senderId: me,
      recipientId: otherId,
      content,
      photoUrl,
    },
  });
  await prisma.conversation.update({
    where: { id: conv.id },
    data: { lastMessage: content || '📷 Photo', lastMessageTime: new Date() },
  });

  const sender = await prisma.user.findUnique({ where: { id: me }, select: publicUserSelect });
  emitToUser(otherId, 'new_message', {
    message: {
      id: message.id,
      senderId: me,
      recipientId: otherId,
      content: message.content,
      photoUrl: message.photoUrl,
      isRead: false,
      createdAt: message.createdAt,
    },
    fromUser: toPublicUser(sender!),
  });
  await notifySocial({
    userId: otherId,
    fromUserId: me,
    type: 'NEW_MESSAGE',
    message: `sent you a message${content ? `: ${content.slice(0, 60)}` : ''}`,
    link: `/messages?user=${me}`,
    messageId: message.id,
  });
  responses.created(res, 'Message sent', {
    message: {
      id: message.id,
      senderId: me,
      recipientId: otherId,
      content: message.content,
      photoUrl: message.photoUrl,
      isRead: false,
      createdAt: message.createdAt,
    },
  });
}

/** PATCH /api/social/messages/:messageId/read — recipient only (read receipt). */
export async function markRead(req: AuthRequest, res: Response) {
  const me = req.userId!;
  const id = String(req.params.messageId);
  const message = await prisma.message.findUnique({ where: { id } });
  if (!message) return responses.notFound(res, 'Message not found');
  if (message.recipientId !== me) return responses.forbidden(res, 'Only the recipient can mark this read');

  const updated = message.isRead
    ? message
    : await prisma.message.update({ where: { id }, data: { isRead: true, readAt: new Date() } });
  if (message.senderId) {
    emitToUser(message.senderId, 'message_read', { messageId: id, readAt: updated.readAt });
  }
  responses.ok(res, 'Marked as read', { isRead: true, readAt: updated.readAt });
}

/** DELETE /api/social/messages/:messageId — sender only, soft delete. */
export async function deleteMessage(req: AuthRequest, res: Response) {
  const me = req.userId!;
  const id = String(req.params.messageId);
  const message = await prisma.message.findUnique({ where: { id } });
  if (!message) return responses.notFound(res, 'Message not found');
  if (message.senderId !== me) return responses.forbidden(res, 'You can only delete your own messages');

  await prisma.message.update({ where: { id }, data: { isDeleted: true } });
  if (message.recipientId) {
    emitToUser(message.recipientId, 'message_deleted', { messageId: id });
  }
  responses.ok(res, 'Message deleted', { success: true });
}

/** GET /api/social/messages/unread-count */
export async function unreadCount(req: AuthRequest, res: Response) {
  const me = req.userId!;
  const unreadCount = await prisma.message.count({
    where: { recipientId: me, isRead: false, isDeleted: false, conversationId: { not: null } },
  });
  responses.ok(res, 'Unread count', { unreadCount });
}
