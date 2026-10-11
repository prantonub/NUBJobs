import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { responses, sendError } from '../utils/response.utils';
import { emitToUser, isUserOnline } from '../lib/socket-server';
import { classifyMessage, consumeMessageQuota } from '../utils/message-tagging.util';
import { notifySocial, parsePage, publicUserSelect, toPublicUser, PublicUserRow } from '../utils/social.utils';

/** Canonical pair ordering — matches the existing messaging system. */
const canonicalPair = (a: string, b: string): [string, string] => (a < b ? [a, b] : [b, a]);

const MESSAGE_MAX = 500; // spec §VALIDATION: messages max 500 chars

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

/** Presence payload for the online dot + "Active 2h ago" (spec §ChatWindow). */
async function presenceOf(userId: string) {
  const online = isUserOnline(userId);
  if (online) return { isOnline: true, lastSeenAt: new Date() };
  const row = await prisma.user.findUnique({ where: { id: userId }, select: { lastSeenAt: true } });
  return { isOnline: false, lastSeenAt: row?.lastSeenAt ?? null };
}

type ReactionMap = Record<string, string[]>;

function parseReactions(value: unknown): ReactionMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: ReactionMap = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (Array.isArray(v)) out[k] = v.filter((x): x is string => typeof x === 'string');
  }
  return out;
}

/** One message as the client consumes it (mine flag + parsed reactions). */
export function serializeMessage(m: any, me: string) {
  const reactions = parseReactions(m.reactions);
  return {
    id: m.id,
    content: m.content,
    photoUrl: m.photoUrl ?? null,
    senderId: m.senderId,
    recipientId: m.recipientId ?? null,
    isMine: m.senderId === me,
    isRead: m.isRead,
    readAt: m.readAt ?? null,
    isPin: Boolean(m.isPin),
    messageType: m.messageType ?? 'DIRECT',
    tags: m.tags ?? [],
    sourceType: m.sourceType ?? null,
    sourceId: m.sourceId ?? null,
    reactions,
    myReactions: Object.keys(reactions).filter((emoji) => reactions[emoji].includes(me)),
    createdAt: m.createdAt,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// 1. GET /api/social/messages — list (filter + search + presence + unread)
// ════════════════════════════════════════════════════════════════════════════
export async function listConversations(req: AuthRequest, res: Response) {
  const me = req.userId!;
  const { page, limit, skip, take } = parsePage(req.query, 20);
  const search = String(req.query.search ?? '').trim().toLowerCase();
  const filter = String(req.query.filter ?? 'all').toLowerCase();

  // Prefilter ids for content filters (one query each — never per-row).
  let idAllow: string[] | null = null;
  const restrict = (ids: string[]) => {
    idAllow = idAllow === null ? ids : idAllow.filter((id) => ids.includes(id));
  };
  if (filter === 'professional' || filter === 'community') {
    const rows = await prisma.message.findMany({
      where: {
        conversationId: { not: null },
        messageType: filter === 'professional' ? 'PROFESSIONAL' : 'COMMUNITY',
        OR: [{ senderId: me }, { recipientId: me }],
      },
      distinct: ['conversationId'],
      select: { conversationId: true },
    });
    restrict(rows.map((r) => r.conversationId as string));
  } else if (filter === 'unread') {
    const rows = await prisma.message.findMany({
      where: { recipientId: me, isRead: false, isDeleted: false, conversationId: { not: null } },
      distinct: ['conversationId'],
      select: { conversationId: true },
    });
    restrict(rows.map((r) => r.conversationId as string));
  }

  const where: any = { OR: [{ user1Id: me }, { user2Id: me }] };
  const wantArchived = filter === 'archived';
  const and: any[] = [
    {
      OR: wantArchived
        ? [{ user1Id: me, user1Archived: true }, { user2Id: me, user2Archived: true }]
        : [{ user1Id: me, user1Archived: false }, { user2Id: me, user2Archived: false }],
    },
  ];
  if (filter === 'pinned') {
    and.push({ OR: [{ user1Id: me, user1Pinned: true }, { user2Id: me, user2Pinned: true }] });
  }
  where.AND = and;
  if (idAllow) where.id = { in: idAllow };

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

  const ids = convs.map((c) => c.id);
  // Batch unread counts — one groupBy instead of N per-row counts (no N+1).
  const unreadRows = ids.length
    ? await prisma.message.groupBy({
        by: ['conversationId'],
        where: { conversationId: { in: ids }, recipientId: me, isRead: false, isDeleted: false },
        _count: { _all: true },
      })
    : [];
  const unreadMap = new Map<string, number>(
    unreadRows.map((r) => [r.conversationId as string, r._count._all])
  );

  const items = convs.map((conv) => {
    const other = (conv.user1Id === me ? conv.user2 : conv.user1) as PublicUserRow;
    const mine1 = conv.user1Id === me;
    return {
      id: conv.id,
      otherUser: toPublicUser(other),
      lastMessage: conv.lastMessage,
      lastMessageTime: conv.lastMessageTime,
      lastMessageType: conv.lastMessageType ?? 'DIRECT',
      unreadCount: unreadMap.get(conv.id) ?? 0,
      isArchived: mine1 ? conv.user1Archived : conv.user2Archived,
      isPinned: mine1 ? conv.user1Pinned : conv.user2Pinned,
      isMuted: mine1 ? conv.user1Muted : conv.user2Muted,
      isOnline: isUserOnline(other.id),
      lastSeenAt: null as Date | null,
      jobId: conv.jobId,
    };
  });

  // "Active 2h ago" for offline peers (only for rows on this page).
  const offlineIds = items.filter((i) => !i.isOnline).map((i) => i.otherUser.id);
  if (offlineIds.length) {
    const users = await prisma.user.findMany({
      where: { id: { in: offlineIds } },
      select: { id: true, lastSeenAt: true },
    });
    const seen = new Map(users.map((u) => [u.id, u.lastSeenAt]));
    for (const item of items) item.lastSeenAt = seen.get(item.otherUser.id) ?? null;
  }

  const filtered = search
    ? items.filter(
        (i) =>
          i.otherUser.name?.toLowerCase().includes(search) ||
          i.otherUser.username?.toLowerCase().includes(search) ||
          (i.lastMessage ?? '').toLowerCase().includes(search)
      )
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

// ════════════════════════════════════════════════════════════════════════════
// 2. GET /api/social/messages/search — conversations + matching messages
// ════════════════════════════════════════════════════════════════════════════
export async function searchConversations(req: AuthRequest, res: Response) {
  const me = req.userId!;
  const q = String(req.query.q ?? '').trim();
  if (!q) return responses.ok(res, 'Empty query', { conversations: [], messages: [] });

  const convs = await prisma.conversation.findMany({
    where: {
      OR: [{ user1Id: me }, { user2Id: me }],
      AND: {
        OR: [
          { user1: { name: { contains: q, mode: 'insensitive' } } },
          { user1: { username: { contains: q, mode: 'insensitive' } } },
          { user2: { name: { contains: q, mode: 'insensitive' } } },
          { user2: { username: { contains: q, mode: 'insensitive' } } },
          { lastMessage: { contains: q, mode: 'insensitive' } },
        ],
      },
    },
    include: { user1: { select: publicUserSelect }, user2: { select: publicUserSelect } },
    orderBy: { lastMessageTime: 'desc' },
    take: 20,
  });

  const messages = await prisma.message.findMany({
    where: {
      OR: [{ senderId: me }, { recipientId: me }],
      conversationId: { not: null },
      isDeleted: false,
      content: { contains: q, mode: 'insensitive' },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  // Message hits carry their thread partner so the UI can jump straight in.
  const partnerIds = Array.from(
    new Set(
      (messages
        .map((m) => (m.senderId === me ? m.recipientId : m.senderId))
        .filter(Boolean) as string[])
    )
  );
  const partners = partnerIds.length
    ? await prisma.user.findMany({ where: { id: { in: partnerIds } }, select: publicUserSelect })
    : [];
  const partnerMap = new Map(partners.map((p) => [p.id, toPublicUser(p)]));

  res.json({
    success: true,
    statusCode: 200,
    message: 'Search results',
    data: {
      conversations: convs.map((conv) => {
        const other = (conv.user1Id === me ? conv.user2 : conv.user1) as PublicUserRow;
        return {
          id: conv.id,
          otherUser: toPublicUser(other),
          lastMessage: conv.lastMessage,
          lastMessageTime: conv.lastMessageTime,
        };
      }),
      messages: messages.map((m) => ({
        ...serializeMessage(m, me),
        otherUser:
          partnerMap.get((m.senderId === me ? m.recipientId : m.senderId) ?? '') ?? null,
      })),
      query: q,
      matched: convs.length + messages.length,
    },
  });
}

// ════════════════════════════════════════════════════════════════════════════
// 3. GET /api/social/messages/search/global — spec item 12 (message|user)
// ════════════════════════════════════════════════════════════════════════════
export async function globalSearch(req: AuthRequest, res: Response) {
  const me = req.userId!;
  const q = String(req.query.q ?? '').trim();
  const type = String(req.query.type ?? 'message') === 'user' ? 'user' : 'message';
  if (!q) return responses.ok(res, 'Empty query', { type, results: [] });

  if (type === 'user') {
    const users = await prisma.user.findMany({
      where: {
        id: { not: me },
        isBanned: false,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { username: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: publicUserSelect,
      take: 20,
    });
    return responses.ok(res, 'User results', {
      type,
      results: users.map((u) => toPublicUser(u)),
    });
  }

  const messages = await prisma.message.findMany({
    where: {
      OR: [{ senderId: me }, { recipientId: me }],
      conversationId: { not: null },
      isDeleted: false,
      content: { contains: q, mode: 'insensitive' },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  const partnerIds = Array.from(
    new Set(
      (messages
        .map((m) => (m.senderId === me ? m.recipientId : m.senderId))
        .filter(Boolean) as string[])
    )
  );
  const partners = partnerIds.length
    ? await prisma.user.findMany({ where: { id: { in: partnerIds } }, select: publicUserSelect })
    : [];
  const partnerMap = new Map(partners.map((p) => [p.id, toPublicUser(p)]));

  return responses.ok(res, 'Message results', {
    type,
    results: messages.map((m) => ({
      ...serializeMessage(m, me),
      otherUser:
        partnerMap.get((m.senderId === me ? m.recipientId : m.senderId) ?? '') ?? null,
    })),
  });
}

// ════════════════════════════════════════════════════════════════════════════
// 4. GET /api/social/messages/:userId — history (presence + conversation flags)
// ════════════════════════════════════════════════════════════════════════════
export async function getHistory(req: AuthRequest, res: Response) {
  const me = req.userId!;
  const otherId = String(req.params.userId);
  const { page, limit, skip, take } = parsePage(req.query, 50);

  const other = await prisma.user.findUnique({
    where: { id: otherId },
    select: { ...publicUserSelect, lastSeenAt: true },
  });
  if (!other) return responses.notFound(res, 'User not found');
  if (await isBlockedPair(me, otherId)) {
    return responses.forbidden(res, 'You cannot message this user');
  }

  const conv = await findPairConversation(me, otherId);
  const thread = conv?.id ?? '__none__';
  const [messages, total, presence] = await Promise.all([
    prisma.message.findMany({
      where: { conversationId: thread, isDeleted: false },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.message.count({ where: { conversationId: thread, isDeleted: false } }),
    presenceOf(otherId),
  ]);

  const mine1 = conv?.user1Id === me;
  res.json({
    success: true,
    statusCode: 200,
    message: 'History fetched',
    data: {
      otherUser: toPublicUser(other as PublicUserRow),
      presence,
      conversation: conv
        ? {
            id: conv.id,
            isPinned: mine1 ? conv.user1Pinned : conv.user2Pinned,
            isMuted: mine1 ? conv.user1Muted : conv.user2Muted,
            isArchived: mine1 ? conv.user1Archived : conv.user2Archived,
          }
        : null,
      messages: messages.slice().reverse().map((m) => serializeMessage(m, me)), // oldest first
      pagination: { page, limit, total, hasMore: skip + take < total },
    },
  });
}

// ════════════════════════════════════════════════════════════════════════════
// 5. POST /api/social/messages/:userId — send (tagging, quota, photo, source)
// ════════════════════════════════════════════════════════════════════════════
export async function sendMessage(req: AuthRequest, res: Response) {
  const me = req.userId!;
  const otherId = String(req.params.userId);
  const body = (req.body ?? {}) as {
    content?: unknown;
    photoUrl?: unknown;
    messageType?: unknown;
    tags?: unknown;
    sourceType?: unknown;
    sourceId?: unknown;
  };

  const content = typeof body.content === 'string' ? body.content.trim() : '';
  const photoUrl =
    typeof body.photoUrl === 'string' && body.photoUrl.trim() ? body.photoUrl.trim() : null;
  if (!content && !photoUrl) return responses.badRequest(res, 'Message content cannot be empty');
  if (content.length > MESSAGE_MAX) {
    return responses.badRequest(res, `Message must be at most ${MESSAGE_MAX} characters`);
  }

  const other = await prisma.user.findUnique({ where: { id: otherId }, select: { id: true } });
  if (!other) return responses.notFound(res, 'User not found');
  if (otherId === me) return responses.badRequest(res, 'Cannot message yourself');
  if (await isBlockedPair(me, otherId)) {
    return responses.forbidden(res, 'You cannot message this user');
  }

  // Rate limiting: 10/min + 100/hour per user (spec §SECURITY).
  const retryAfter = consumeMessageQuota(me);
  if (retryAfter !== null) {
    res.set('Retry-After', String(retryAfter));
    return sendError(res, 429, 'Too many messages', `Please slow down — try again in ${retryAfter}s`);
  }

  // Auto-tagging; an explicit sender choice (manual tag) always wins.
  const tag = classifyMessage(content, {
    messageType: typeof body.messageType === 'string' ? body.messageType : undefined,
    tags: Array.isArray(body.tags) ? (body.tags as string[]) : undefined,
  });
  const sourceId =
    typeof body.sourceId === 'string' && body.sourceId.trim() ? body.sourceId.trim() : null;

  const conv = await ensurePairConversation(me, otherId);
  const message = await prisma.message.create({
    data: {
      conversationId: conv.id,
      senderId: me,
      recipientId: otherId,
      content,
      photoUrl,
      messageType: tag.messageType,
      tags: tag.tags,
      sourceType: sourceId ? 'POST' : 'GENERAL',
      sourceId,
    },
  });
  await prisma.conversation.update({
    where: { id: conv.id },
    data: {
      lastMessage: content || '📷 Photo',
      lastMessageTime: new Date(),
      lastMessageType: tag.messageType,
    },
  });

  const sender = await prisma.user.findUnique({ where: { id: me }, select: publicUserSelect });
  const payload = {
    message: serializeMessage(message, otherId),
    fromUser: toPublicUser(sender!),
    conversationId: conv.id,
  };
  emitToUser(otherId, 'new_message', payload);
  emitToUser(me, 'new_message', payload); // sender's other tabs stay in sync
  const convUpdate = {
    id: conv.id,
    lastMessage: content || '📷 Photo',
    lastMessageTime: message.createdAt,
    lastMessageType: tag.messageType,
  };
  emitToUser(otherId, 'conversation:update', { ...convUpdate, otherUserId: me });
  emitToUser(me, 'conversation:update', { ...convUpdate, otherUserId: otherId });

  await notifySocial({
    userId: otherId,
    fromUserId: me,
    type: 'NEW_MESSAGE',
    message: `sent you a message${content ? `: ${content.slice(0, 60)}` : ''}`,
    link: `/messages?user=${me}`,
    messageId: message.id,
  });
  responses.created(res, 'Message sent', { message: serializeMessage(message, me) });
}

// ════════════════════════════════════════════════════════════════════════════
// 6. PATCH /api/social/messages/:messageId/read — recipient only
// ════════════════════════════════════════════════════════════════════════════
export async function markRead(req: AuthRequest, res: Response) {
  const me = req.userId!;
  const id = String(req.params.messageId);
  const message = await prisma.message.findUnique({ where: { id } });
  if (!message) return responses.notFound(res, 'Message not found');
  if (message.recipientId !== me) {
    return responses.forbidden(res, 'Only the recipient can mark this read');
  }

  const updated = message.isRead
    ? message
    : await prisma.message.update({ where: { id }, data: { isRead: true, readAt: new Date() } });
  if (message.senderId) {
    emitToUser(message.senderId, 'message_read', { messageId: id, readAt: updated.readAt });
  }
  responses.ok(res, 'Marked as read', { isRead: true, readAt: updated.readAt });
}

// ════════════════════════════════════════════════════════════════════════════
// 7. DELETE /api/social/messages/:messageId — sender only, soft delete
// ════════════════════════════════════════════════════════════════════════════
export async function deleteMessage(req: AuthRequest, res: Response) {
  const me = req.userId!;
  const id = String(req.params.messageId);
  const message = await prisma.message.findUnique({ where: { id } });
  if (!message) return responses.notFound(res, 'Message not found');
  if (message.senderId !== me) {
    return responses.forbidden(res, 'You can only delete your own messages');
  }

  await prisma.message.update({ where: { id }, data: { isDeleted: true } });
  if (message.recipientId) emitToUser(message.recipientId, 'message_deleted', { messageId: id });
  emitToUser(me, 'message_deleted', { messageId: id });
  responses.ok(res, 'Message deleted', { success: true });
}

// ════════════════════════════════════════════════════════════════════════════
// 8. PATCH /api/social/messages/:messageId/pin — sender only (spec #7)
// ════════════════════════════════════════════════════════════════════════════
export async function pinMessage(req: AuthRequest, res: Response) {
  const me = req.userId!;
  const id = String(req.params.messageId);
  const message = await prisma.message.findUnique({ where: { id } });
  if (!message) return responses.notFound(res, 'Message not found');
  if (message.senderId !== me) {
    return responses.forbidden(res, 'You can only pin your own messages');
  }

  const updated = await prisma.message.update({
    where: { id },
    data: { isPin: !message.isPin },
  });
  if (message.recipientId) {
    emitToUser(message.recipientId, 'message_updated', { messageId: id, isPin: updated.isPin });
  }
  emitToUser(me, 'message_updated', { messageId: id, isPin: updated.isPin });
  responses.ok(res, updated.isPin ? 'Message pinned' : 'Message unpinned', {
    isPin: updated.isPin,
  });
}

// ════════════════════════════════════════════════════════════════════════════
// 9. PATCH /api/social/messages/:messageId/reaction — either participant
// ════════════════════════════════════════════════════════════════════════════
export async function reactToMessage(req: AuthRequest, res: Response) {
  const me = req.userId!;
  const id = String(req.params.messageId);
  const emoji = String((req.body as any)?.emoji ?? '').trim();
  if (!emoji || emoji.length > 8 || /\s/.test(emoji)) {
    return responses.badRequest(res, 'Reaction emoji is required');
  }

  const message = await prisma.message.findUnique({ where: { id } });
  if (!message || message.isDeleted) return responses.notFound(res, 'Message not found');
  if (message.senderId !== me && message.recipientId !== me) {
    return responses.forbidden(res, 'Only conversation participants can react');
  }

  const current = parseReactions(message.reactions);
  const users = new Set(current[emoji] ?? []);
  const added = !users.has(me);
  if (added) users.add(me);
  else users.delete(me);
  if (users.size === 0) delete current[emoji];
  else current[emoji] = Array.from(users);

  const updated = await prisma.message.update({
    where: { id },
    data: { reactions: current as any },
  });
  const payload = { messageId: id, reactions: parseReactions(updated.reactions) };
  if (message.senderId) emitToUser(message.senderId, 'message_reaction', payload);
  if (message.recipientId) emitToUser(message.recipientId, 'message_reaction', payload);
  responses.ok(res, added ? 'Reaction added' : 'Reaction removed', payload);
}

// ════════════════════════════════════════════════════════════════════════════
// 10. PATCH /api/social/messages/:userId/conversation — pin/archive/mute flags
// ════════════════════════════════════════════════════════════════════════════
export async function updateConversationFlags(req: AuthRequest, res: Response) {
  const me = req.userId!;
  const otherId = String(req.params.userId);
  const body = (req.body ?? {}) as { pinned?: unknown; archived?: unknown; muted?: unknown };

  const conv = await findPairConversation(me, otherId);
  if (!conv) return responses.notFound(res, 'Conversation not found');
  const mine1 = conv.user1Id === me;

  const data: Record<string, boolean> = {};
  if (typeof body.pinned === 'boolean') data[mine1 ? 'user1Pinned' : 'user2Pinned'] = body.pinned;
  if (typeof body.archived === 'boolean') data[mine1 ? 'user1Archived' : 'user2Archived'] = body.archived;
  if (typeof body.muted === 'boolean') data[mine1 ? 'user1Muted' : 'user2Muted'] = body.muted;
  if (Object.keys(data).length === 0) return responses.badRequest(res, 'Nothing to update');

  const updated = await prisma.conversation.update({ where: { id: conv.id }, data });
  emitToUser(otherId, 'conversation_updated', { conversationId: conv.id });
  responses.ok(res, 'Conversation updated', {
    isPinned: mine1 ? updated.user1Pinned : updated.user2Pinned,
    isArchived: mine1 ? updated.user1Archived : updated.user2Archived,
    isMuted: mine1 ? updated.user1Muted : updated.user2Muted,
  });
}

// ════════════════════════════════════════════════════════════════════════════
// 11. GET/PATCH /api/social/settings/notifications — per-user preferences
// ════════════════════════════════════════════════════════════════════════════
export const DEFAULT_NOTIF_SETTINGS = {
  enableMessages: true,
  enableSound: true,
  enableEmail: false,
};

export async function getNotificationSettings(req: AuthRequest, res: Response) {
  const me = req.userId!;
  const user = await prisma.user.findUnique({ where: { id: me }, select: { notifSettings: true } });
  const stored = (user?.notifSettings ?? {}) as Record<string, unknown>;
  responses.ok(res, 'Notification settings', {
    settings: {
      enableMessages:
        typeof stored.enableMessages === 'boolean'
          ? stored.enableMessages
          : DEFAULT_NOTIF_SETTINGS.enableMessages,
      enableSound:
        typeof stored.enableSound === 'boolean'
          ? stored.enableSound
          : DEFAULT_NOTIF_SETTINGS.enableSound,
      enableEmail:
        typeof stored.enableEmail === 'boolean'
          ? stored.enableEmail
          : DEFAULT_NOTIF_SETTINGS.enableEmail,
    },
  });
}

export async function updateNotificationSettings(req: AuthRequest, res: Response) {
  const me = req.userId!;
  const body = (req.body ?? {}) as Record<string, unknown>;
  const user = await prisma.user.findUnique({ where: { id: me }, select: { notifSettings: true } });
  const current: Record<string, boolean> = {
    ...DEFAULT_NOTIF_SETTINGS,
    ...((user?.notifSettings ?? {}) as Record<string, boolean>),
  };

  for (const key of Object.keys(DEFAULT_NOTIF_SETTINGS)) {
    if (typeof body[key] === 'boolean') current[key] = body[key] as boolean;
  }
  await prisma.user.update({ where: { id: me }, data: { notifSettings: current } });
  responses.ok(res, 'Notification settings saved', { settings: current });
}

// ════════════════════════════════════════════════════════════════════════════
// 12. GET /api/social/messages/unread-count
// ════════════════════════════════════════════════════════════════════════════
export async function unreadCount(req: AuthRequest, res: Response) {
  const me = req.userId!;
  const unreadCount = await prisma.message.count({
    where: { recipientId: me, isRead: false, isDeleted: false, conversationId: { not: null } },
  });
  responses.ok(res, 'Unread count', { unreadCount });
}






