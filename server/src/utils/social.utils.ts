import prisma from '../lib/prisma';
import { emitToUser } from '../lib/socket-server';
import { NotificationType, Prisma } from '@prisma/client';

/** Shared author selection for feed/profile payloads (never leaks email/password). */
export const publicUserSelect = {
  id: true,
  username: true,
  name: true,
  role: true,
  bio: true,
  location: true,
  website: true,
  avatarUrl: true,
  followerCount: true,
  followingCount: true,
  postCount: true,
  createdAt: true,
  studentProfile: { select: { photoUrl: true } },
  employerProfile: { select: { companyName: true, logoUrl: true, isVerified: true } },
} satisfies Prisma.UserSelect;

export type PublicUserRow = Prisma.UserGetPayload<{ select: typeof publicUserSelect }>;

/** Best available profile photo: social avatar → student photo → company logo. */
/** Best available profile photo: social avatar → student photo → company logo. */
export function photoOf(u: PublicUserRow): string | null {
  return u.avatarUrl ?? u.studentProfile?.photoUrl ?? u.employerProfile?.logoUrl ?? null;
}

export function toPublicUser(u: PublicUserRow, isFollowing?: boolean) {
  return {
    id: u.id,
    username: u.username,
    name: u.name,
    role: u.role,
    photo: photoOf(u),
    bio: u.bio ?? null,
    location: u.location ?? null,
    website: u.website ?? null,
    followerCount: u.followerCount,
    followingCount: u.followingCount,
    postCount: u.postCount,
    joinedAt: u.createdAt,
    company: u.employerProfile?.companyName ?? null,
    isVerified: u.employerProfile?.isVerified ?? false,
    ...(typeof isFollowing === 'boolean' ? { isFollowing } : {}),
  };
}

/** Max 5 unique lowercase hashtags per post (spec: validation). */
export function extractHashtags(content: string): string[] {
  const found = content.match(/#([A-Za-z0-9_]+)/g) ?? [];
  const unique = Array.from(new Set(found.map((t) => t.slice(1).toLowerCase())));
  return unique.slice(0, 5);
}

/** @username mentions → resolved later to user ids. */
export function extractMentions(content: string): string[] {
  const found = content.match(/@([A-Za-z0-9_]+)/g) ?? [];
  return Array.from(new Set(found.map((t) => t.slice(1).toLowerCase()))).slice(0, 20);
}

/** Resolve mention usernames to user ids (unknown names are ignored). */
export async function resolveMentionIds(usernames: string[]): Promise<string[]> {
  if (!usernames.length) return [];
  const rows = await prisma.user.findMany({
    where: { username: { in: usernames } },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

/** Upsert hashtag counters: removed tags decrement, new tags increment. */
export async function bumpHashtags(add: string[], remove: string[] = []) {
  for (const name of remove) {
    if (!name) continue;
    const row = await prisma.hashtag.findUnique({ where: { name } });
    if (row) {
      await prisma.hashtag.update({
        where: { name },
        data: { postCount: Math.max(0, row.postCount - 1), trendingScore: Math.max(0, row.trendingScore - 5) },
      });
    }
  }
  for (const name of add) {
    if (!name) continue;
    await prisma.hashtag.upsert({
      where: { name },
      update: { postCount: { increment: 1 }, trendingScore: { increment: 5 }, lastUsedAt: new Date() },
      create: { name, postCount: 1, trendingScore: 5 },
    });
  }
}

/**
 * Create an in-app notification + push it over Socket.io.
 * Self-notifications and muted users are skipped (spec: mute setting).
 */
export async function notifySocial(opts: {
  userId: string;
  fromUserId: string;
  type: NotificationType;
  message: string;
  link?: string;
  postId?: string;
  commentId?: string;
  messageId?: string;
}): Promise<void> {
  try {
    if (!opts.userId || opts.userId === opts.fromUserId) return;
    const target = await prisma.user.findUnique({
      where: { id: opts.userId },
      select: { notificationsMuted: true },
    });
    if (!target || target.notificationsMuted) return;
    const notification = await prisma.notification.create({
      data: {
        userId: opts.userId,
        type: opts.type,
        message: opts.message,
        link: opts.link,
        fromUserId: opts.fromUserId,
        postId: opts.postId,
        commentId: opts.commentId,
        messageId: opts.messageId,
      },
    });
    emitToUser(opts.userId, 'new_notification', { notification });
  } catch (error) {
    console.error('notifySocial failed:', error);
  }
}

// ─── Post / comment serialization ────────────────────────────────────────────

export type PostRow = Prisma.PostGetPayload<{ include: { author: { select: typeof publicUserSelect } } }>;
export type CommentRow = Prisma.CommentGetPayload<{
  include: {
    author: { select: typeof publicUserSelect };
    replies: { include: { author: { select: typeof publicUserSelect } } };
  };
}>;

/** postId → did the viewer like it (single query for a page of posts). */
export async function likedPostSet(postIds: string[], viewerId?: string): Promise<Set<string>> {
  if (!viewerId || !postIds.length) return new Set();
  const rows = await prisma.like.findMany({
    where: { userId: viewerId, postId: { in: postIds } },
    select: { postId: true },
  });
  return new Set(rows.map((r) => r.postId).filter(Boolean) as string[]);
}

/** Twitter-style poll payload attached to a serialized post (null when none). */
export interface SerializedPoll {
  question: string;
  options: { text: string; votes: number }[];
  totalVotes: number;
  myVote: number | null;
}

/**
 * Validate poll input from create/edit body.
 * Returns `{ question, options }` or throws a 400 HttpError.
 * Pass `allowAbsent=true` for edit (absent = keep existing; explicit null = remove).
 */
export function parsePollInput(body: any, allowAbsent = false): { question: string | null; options: string[] } {
  const hasQuestion = body?.pollQuestion !== undefined;
  const hasOptions = body?.pollOptions !== undefined;
  if (allowAbsent && !hasQuestion && !hasOptions) return { question: null, options: [] };
  if (!hasQuestion && !hasOptions) return { question: null, options: [] };
  const question = String(body?.pollQuestion ?? '').trim();
  const rawOptions: unknown = body?.pollOptions;
  const options = (Array.isArray(rawOptions) ? rawOptions : [])
    .map((o) => String(o ?? '').trim())
    .filter(Boolean)
    .slice(0, 4);
  if (!question && options.length === 0) return { question: null, options: [] };
  if (!question) throw Object.assign(new Error('Poll question is required'), { statusCode: 400 });
  if (question.length > 140) throw Object.assign(new Error('Poll question must be 140 characters or fewer'), { statusCode: 400 });
  if (options.length < 2) throw Object.assign(new Error('Poll needs at least 2 options'), { statusCode: 400 });
  if (options.some((o) => o.length > 60)) throw Object.assign(new Error('Poll options must be 60 characters or fewer'), { statusCode: 400 });
  const dupes = new Set(options.map((o) => o.toLowerCase()));
  if (dupes.size !== options.length) throw Object.assign(new Error('Poll options must be unique'), { statusCode: 400 });
  return { question, options };
}

/**
 * postIds → vote counts per option index + viewer's own vote.
 * Two queries total regardless of page size.
 */
export async function pollVoteMap(
  postIds: string[],
  viewerId: string
): Promise<Map<string, { counts: number[]; myVote: number | null }>> {
  const empty = new Map<string, { counts: number[]; myVote: number | null }>();
  if (!postIds.length) return empty;
  const votes = await prisma.pollVote.findMany({
    where: { postId: { in: postIds } },
    select: { postId: true, userId: true, optionIdx: true },
  });
  for (const v of votes) {
    let entry = empty.get(v.postId);
    if (!entry) {
      entry = { counts: [], myVote: null };
      empty.set(v.postId, entry);
    }
    entry.counts[v.optionIdx] = (entry.counts[v.optionIdx] ?? 0) + 1;
    if (v.userId === viewerId) entry.myVote = v.optionIdx;
  }
  return empty;
}

export function serializePost(
  row: PostRow,
  viewerId: string,
  liked: boolean,
  poll?: { counts: number[]; myVote: number | null }
) {
  const withinEditWindow =
    Date.now() - new Date(row.createdAt).getTime() < 30 * 60 * 1000; // 30 min (spec)
  const hasPoll = Boolean(row.pollQuestion && row.pollOptions?.length >= 2);
  const counts = poll?.counts ?? [];
  const options = (row.pollOptions ?? []).map((text, i) => ({ text, votes: counts[i] ?? 0 }));
  const totalVotes = options.reduce((sum, o) => sum + o.votes, 0);
  return {
    id: row.id,
    content: row.content,
    photoUrl: row.photoUrl,
    hashtags: row.hashtags,
    poll: hasPoll
      ? { question: row.pollQuestion!, options, totalVotes, myVote: poll?.myVote ?? null }
      : null,
    likeCount: row.likeCount,
    commentCount: row.commentCount,
    likedByMe: liked,
    isDeleted: row.isDeleted,
    canEdit: !row.isDeleted && row.authorId === viewerId && withinEditWindow,
    canDelete: row.authorId === viewerId,
    editedAt: row.editedAt,
    createdAt: row.createdAt,
    author: toPublicUser(row.author),
  };
}

export function serializeComment(
  row: CommentRow,
  viewerId: string,
  likedIds: Set<string>,
  postAuthorId: string
): any {
  return {
    id: row.id,
    postId: row.postId,
    parentCommentId: row.parentCommentId,
    content: row.isDeleted ? '' : row.content,
    isDeleted: row.isDeleted,
    likeCount: row.likeCount,
    likedByMe: likedIds.has(row.id),
    canDelete: !row.isDeleted && (row.authorId === viewerId || postAuthorId === viewerId),
    createdAt: row.createdAt,
    author: toPublicUser(row.author),
    replies: ((row.replies as CommentRow[] | undefined) ?? [])
      .filter((r) => !r.isDeleted)
      .map((r) => serializeComment(r, viewerId, likedIds, postAuthorId)),
  };
}

/** Clamp page/limit query params (spec: 20 per page default, 50 max). */
export function parsePage(query: any, defaultLimit = 20, maxLimit = 50) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(maxLimit, Math.max(1, Number(query.limit) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit, take: limit };
}
