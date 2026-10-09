import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { responses } from '../utils/response.utils';
import { emitToUser } from '../lib/socket-server';
import {
  likedPostSet,
  notifySocial,
  parsePage,
  pollVoteMap,
  publicUserSelect,
  serializePost,
  toPublicUser,
} from '../utils/social.utils';

const VALID_URL = /^(https?:\/\/)[^\s/$.?#].[^\s]*$/i;

async function findUserByUsername(username: string | string[]) {
  return prisma.user.findUnique({ where: { username: String(username).toLowerCase() } });
}

async function isFollowingSet(viewerId: string, targetIds: string[]): Promise<Set<string>> {
  if (!targetIds.length) return new Set();
  const rows = await prisma.follow.findMany({
    where: { followerId: viewerId, followingId: { in: targetIds } },
    select: { followingId: true },
  });
  return new Set(rows.map((r) => r.followingId));
}

/** GET /api/social/users/:username — public profile + counts + isFollowing. */
export async function getUserProfile(req: AuthRequest, res: Response) {
  const me = req.userId!;
  const user = await findUserByUsername(req.params.username);
  if (!user) return responses.notFound(res, 'User not found');

  const postCount = await prisma.post.count({ where: { authorId: user.id, isDeleted: false } });
  const [followRow, full] = await Promise.all([
    prisma.follow.findFirst({ where: { followerId: me, followingId: user.id }, select: { id: true } }),
    prisma.user.findUnique({ where: { id: user.id }, select: publicUserSelect }),
  ]);
  res.json({
    success: true,
    statusCode: 200,
    message: 'Profile fetched',
    data: {
      user: { ...toPublicUser(full!), postCount, isFollowing: Boolean(followRow), isSelf: user.id === me },
    },
  });
}

/** PATCH /api/social/users/me — photo/bio(≤150)/location/website. */
export async function updateMe(req: AuthRequest, res: Response) {
  const me = req.userId!;
  const data: Record<string, any> = {};

  if (req.body?.photo !== undefined) data.avatarUrl = req.body.photo ? String(req.body.photo) : null;
  if (req.body?.bio !== undefined) {
    const bio = String(req.body.bio ?? '');
    if (bio.length > 150) return responses.badRequest(res, 'Bio must be 150 characters or fewer');
    data.bio = bio || null;
  }
  if (req.body?.location !== undefined) data.location = String(req.body.location || '') || null;
  if (req.body?.website !== undefined) {
    const website = String(req.body.website || '').trim();
    if (website && !VALID_URL.test(website)) return responses.badRequest(res, 'Website must be a valid URL');
    data.website = website || null;
  }

  const updated = await prisma.user.update({ where: { id: me }, data, select: publicUserSelect });
  responses.ok(res, 'Profile updated', { user: toPublicUser(updated) });
}

/** GET /api/social/users/:username/posts — paginated post history. */
export async function getUserPosts(req: AuthRequest, res: Response) {
  const me = req.userId!;
  const user = await findUserByUsername(req.params.username);
  if (!user) return responses.notFound(res, 'User not found');
  const { page, limit, skip, take } = parsePage(req.query);

  const where = { authorId: user.id, isDeleted: false };
  const [rows, total] = await Promise.all([
    prisma.post.findMany({
      where,
      include: { author: { select: publicUserSelect } },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.post.count({ where }),
  ]);
  const liked = await likedPostSet(rows.map((r) => r.id), me);
  const polls = await pollVoteMap(rows.map((r) => r.id), me);
  res.json({
    success: true,
    statusCode: 200,
    message: 'Posts fetched',
    data: {
      posts: rows.map((r) => serializePost(r, me, liked.has(r.id), polls.get(r.id))),
      pagination: { page, limit, total, hasMore: skip + rows.length < total },
    },
  });
}

/** POST /api/social/users/:username/follow */
export async function followUser(req: AuthRequest, res: Response) {
  const me = req.userId!;
  const target = await findUserByUsername(req.params.username);
  if (!target) return responses.notFound(res, 'User not found');
  if (target.id === me) return responses.badRequest(res, 'You cannot follow yourself');

  const existing = await prisma.follow.findFirst({
    where: { followerId: me, followingId: target.id },
    select: { id: true },
  });
  if (!existing) {
    await prisma.$transaction([
      prisma.follow.create({ data: { followerId: me, followingId: target.id } }),
      prisma.user.update({ where: { id: target.id }, data: { followerCount: { increment: 1 } } }),
      prisma.user.update({ where: { id: me }, data: { followingCount: { increment: 1 } } }),
    ]);
    await notifySocial({
      userId: target.id,
      fromUserId: me,
      type: 'FOLLOW',
      message: 'started following you',
      link: `/community/search?tab=users&q=`,
    });
  }
  const fresh = await prisma.user.findUniqueOrThrow({
    where: { id: target.id },
    select: { followerCount: true },
  });
  emitToUser(target.id, 'follower_count_updated', { userId: target.id, followerCount: fresh.followerCount });
  responses.ok(res, 'Now following', { isFollowing: true, followerCount: fresh.followerCount });
}

/** DELETE /api/social/users/:username/follow */
export async function unfollowUser(req: AuthRequest, res: Response) {
  const me = req.userId!;
  const target = await findUserByUsername(req.params.username);
  if (!target) return responses.notFound(res, 'User not found');

  const existing = await prisma.follow.findFirst({
    where: { followerId: me, followingId: target.id },
    select: { id: true },
  });
  if (existing) {
    await prisma.$transaction([
      prisma.follow.delete({ where: { id: existing.id } }),
      prisma.user.update({ where: { id: target.id }, data: { followerCount: { decrement: 1 } } }),
      prisma.user.update({ where: { id: me }, data: { followingCount: { decrement: 1 } } }),
    ]);
  }
  const fresh = await prisma.user.findUniqueOrThrow({
    where: { id: target.id },
    select: { followerCount: true },
  });
  const followerCount = Math.max(0, fresh.followerCount);
  if (fresh.followerCount < 0) {
    await prisma.user.update({ where: { id: target.id }, data: { followerCount: 0 } });
  }
  emitToUser(target.id, 'follower_count_updated', { userId: target.id, followerCount });
  responses.ok(res, 'Unfollowed', { isFollowing: false, followerCount });
}

/** GET /api/social/users/:username/followers */
export async function listFollowers(req: AuthRequest, res: Response) {
  const me = req.userId!;
  const user = await findUserByUsername(req.params.username);
  if (!user) return responses.notFound(res, 'User not found');
  const { page, limit, skip, take } = parsePage(req.query, 50);

  const where = { followingId: user.id };
  const [rows, total] = await Promise.all([
    prisma.follow.findMany({
      where,
      include: { follower: { select: publicUserSelect } },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.follow.count({ where }),
  ]);
  const followingSet = await isFollowingSet(
    me,
    rows.map((r) => r.followerId)
  );
  res.json({
    success: true,
    statusCode: 200,
    message: 'Followers fetched',
    data: {
      followers: rows.map((r) => toPublicUser(r.follower, followingSet.has(r.followerId))),
      pagination: { page, limit, total, hasMore: skip + rows.length < total },
    },
  });
}

/** GET /api/social/users/:username/following */
export async function listFollowing(req: AuthRequest, res: Response) {
  const me = req.userId!;
  const user = await findUserByUsername(req.params.username);
  if (!user) return responses.notFound(res, 'User not found');
  const { page, limit, skip, take } = parsePage(req.query, 50);

  const where = { followerId: user.id };
  const [rows, total] = await Promise.all([
    prisma.follow.findMany({
      where,
      include: { following: { select: publicUserSelect } },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.follow.count({ where }),
  ]);
  const followingSet = await isFollowingSet(
    me,
    rows.map((r) => r.followingId)
  );
  res.json({
    success: true,
    statusCode: 200,
    message: 'Following fetched',
    data: {
      following: rows.map((r) => toPublicUser(r.following, followingSet.has(r.followingId))),
      pagination: { page, limit, total, hasMore: skip + rows.length < total },
    },
  });
}

/** GET /api/social/suggestions — people I don't follow yet, by popularity. */
export async function getSuggestions(req: AuthRequest, res: Response) {
  const me = req.userId!;
  const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 5));

  const alreadyFollowing = await prisma.follow.findMany({
    where: { followerId: me },
    select: { followingId: true },
  });
  const exclude = new Set<string>([me, ...alreadyFollowing.map((f) => f.followingId)]);
  const rows = await prisma.user.findMany({
    where: { id: { notIn: Array.from(exclude) }, role: { not: 'ADMIN' }, username: { not: null } },
    select: publicUserSelect,
    orderBy: [{ followerCount: 'desc' }, { createdAt: 'desc' }],
    take: limit,
  });
  res.json({
    success: true,
    statusCode: 200,
    message: 'Suggestions fetched',
    data: { users: rows.map((u) => toPublicUser(u, false)) },
  });
}
