import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { responses } from '../utils/response.utils';
import {
  likedPostSet,
  parsePage,
  pollVoteMap,
  publicUserSelect,
  serializePost,
  toPublicUser,
} from '../utils/social.utils';

/** GET /api/social/search/posts?q=&hashtag= */
export async function searchPosts(req: AuthRequest, res: Response) {
  const me = req.userId!;
  const q = String(req.query.q ?? '').trim();
  const hashtag = String(req.query.hashtag ?? '').trim().replace(/^#/, '').toLowerCase();
  const { page, limit, skip, take } = parsePage(req.query);

  const and: any[] = [{ isDeleted: false }];
  if (q) and.push({ content: { contains: q, mode: 'insensitive' } });
  if (hashtag) and.push({ hashtags: { has: hashtag } });
  const where = { AND: and };

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
    message: 'Posts found',
    data: {
      posts: rows.map((r) => serializePost(r, me, liked.has(r.id), polls.get(r.id))),
      pagination: { page, limit, total, hasMore: skip + rows.length < total },
    },
  });
}

/** GET /api/social/search/users?q= */
export async function searchUsers(req: AuthRequest, res: Response) {
  const me = req.userId!;
  const q = String(req.query.q ?? '').trim();
  const { page, limit, skip, take } = parsePage(req.query);

  const where = q
    ? {
        AND: [
          { username: { not: null } },
          {
            OR: [
              { username: { contains: q, mode: 'insensitive' as const } },
              { name: { contains: q, mode: 'insensitive' as const } },
            ],
          },
        ],
      }
    : { username: { not: null } };

  const [rows, total, mine] = await Promise.all([
    prisma.user.findMany({ where, select: publicUserSelect, orderBy: { followerCount: 'desc' }, skip, take }),
    prisma.user.count({ where }),
    prisma.follow.findMany({ where: { followerId: me }, select: { followingId: true } }),
  ]);
  const followingSet = new Set(mine.map((f) => f.followingId));
  res.json({
    success: true,
    statusCode: 200,
    message: 'Users found',
    data: {
      users: rows
        .filter((u) => u.id !== me)
        .map((u) => toPublicUser(u, followingSet.has(u.id))),
      pagination: { page, limit, total, hasMore: skip + rows.length < total },
    },
  });
}

/** GET /api/social/hashtags/:hashtag — posts carrying this hashtag. */
export async function getHashtagPosts(req: AuthRequest, res: Response) {
  const me = req.userId!;
  const name = String(req.params.hashtag).trim().replace(/^#/, '').toLowerCase();
  const { page, limit, skip, take } = parsePage(req.query);
  const where = { isDeleted: false, hashtags: { has: name } };

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
    message: `Posts tagged #${name}`,
    data: {
      hashtag: name,
      posts: rows.map((r) => serializePost(r, me, liked.has(r.id), polls.get(r.id))),
      pagination: { page, limit, total, hasMore: skip + rows.length < total },
    },
  });
}

/** GET /api/social/trending/hashtags */
export async function trendingHashtags(req: AuthRequest, res: Response) {
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
  const hashtags = await prisma.hashtag.findMany({
    orderBy: [{ postCount: 'desc' }, { trendingScore: 'desc' }, { lastUsedAt: 'desc' }],
    take: limit,
  });
  res.json({
    success: true,
    statusCode: 200,
    message: 'Trending hashtags fetched',
    data: { hashtags },
  });
}

/** POST /api/social/report — report a post/comment/user (simple moderation). */
export async function listCommunityPosts(req: AuthRequest, res: Response) {
  const me = req.userId!;
  const { page, limit, skip, take } = parsePage(req.query);
  const [rows, total] = await Promise.all([
    prisma.communityPost.findMany({
      where: { isDeleted: false },
      include: { author: { select: publicUserSelect }, community: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' as const },
      skip, take,
    }),
    prisma.communityPost.count({ where: { isDeleted: false } }),
  ]);
  const liked = await likedPostSet(rows.map(r => r.id), me);
  res.json({
    success: true,
    statusCode: 200,
    message: 'Community posts fetched',
    data: { posts: rows.map(r => serializePost(r as any, me, liked.has(r.id))), pagination: { page, limit, total, hasMore: skip + rows.length < total } },
  });
}

export async function listCommunityMembers(req: AuthRequest, res: Response) {
  const me = req.userId!;
  const { page, limit, skip, take } = parsePage(req.query);
  const { communityId } = req.query as { communityId?: string };
  const where = communityId ? { communityId } : {};
  const [rows, total] = await Promise.all([
    prisma.communityMember.findMany({ where, include: { user: { select: publicUserSelect } }, skip, take, orderBy: { createdAt: 'desc' as const } }),
    prisma.communityMember.count({ where }),
  ]);
  res.json({
    success: true,
    statusCode: 200,
    message: 'Community members fetched',
    data: { members: rows.map(r => r.user), pagination: { page, limit, total, hasMore: skip + rows.length < total } },
  });
}

export async function listCommunityAnnouncements(req: AuthRequest, res: Response) {
  const { page, limit, skip, take } = parsePage(req.query);
  const [rows, total] = await Promise.all([
    prisma.communityAnnouncement.findMany({ skip, take, orderBy: { createdAt: 'desc' as const } }),
    prisma.communityAnnouncement.count(),
  ]);
  res.json({
    success: true,
    statusCode: 200,
    message: 'Community announcements fetched',
    data: { announcements: rows, pagination: { page, limit, total, hasMore: skip + rows.length < total } },
  });
}

export async function reportContent(req: AuthRequest, res: Response) {
  const me = req.userId!;
  const contentType = String(req.body?.contentType ?? '').trim();
  const contentId = String(req.body?.contentId ?? '').trim();
  const reason = String(req.body?.reason ?? '').trim();
  const description = req.body?.description ? String(req.body.description) : null;

  if (!['post', 'comment', 'user'].includes(contentType)) {
    return responses.badRequest(res, 'contentType must be post, comment or user');
  }
  if (!contentId || !reason) return responses.badRequest(res, 'contentId and reason are required');

  if (contentType === 'post') {
    const post = await prisma.post.findUnique({ where: { id: contentId }, select: { id: true } });
    if (!post) return responses.notFound(res, 'Post not found');
  } else if (contentType === 'comment') {
    const comment = await prisma.comment.findUnique({ where: { id: contentId }, select: { id: true } });
    if (!comment) return responses.notFound(res, 'Comment not found');
  } else {
    const user = await prisma.user.findUnique({ where: { id: contentId }, select: { id: true } });
    if (!user) return responses.notFound(res, 'User not found');
  }

  const report = await prisma.report.create({
    data: { reporterId: me, contentType, contentId, reason, description },
  });
  responses.created(res, 'Report submitted', { report });
}
