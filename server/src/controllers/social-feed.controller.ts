import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { responses, sendError } from '../utils/response.utils';
import { emitFeed } from '../lib/socket-server';
import {
  extractHashtags,
  extractMentions,
  likedPostSet,
  notifySocial,
  parsePage,
  parsePollInput,
  pollVoteMap,
  publicUserSelect,
  resolveMentionIds,
  serializeComment,
  serializePost,
  bumpHashtags,
  CommentRow,
  PostRow,
} from '../utils/social.utils';

const postInclude = { author: { select: publicUserSelect } } as const;
const commentInclude = {
  author: { select: publicUserSelect },
  replies: { include: { author: { select: publicUserSelect } }, orderBy: { createdAt: 'asc' as const } },
} as const;

/** GET /api/social/feed — network-wide timeline (all users' posts, newest first). */
export async function getFeed(req: AuthRequest, res: Response) {
  const me = req.userId!;
  const { page, limit, skip, take } = parsePage(req.query);
  const where = { isDeleted: false };

  const [rows, total] = await Promise.all([
    prisma.post.findMany({
      where,
      include: postInclude,
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
    message: 'Feed fetched',
    data: {
      posts: rows.map((r) => serializePost(r, me, liked.has(r.id), polls.get(r.id))),
      pagination: { page, limit, total, hasMore: skip + rows.length < total },
    },
  });
}

/** GET /api/social/feed/trending — popular posts from the last 7 days. */
export async function getTrendingFeed(req: AuthRequest, res: Response) {
  const me = req.userId!;
  const { page, limit, skip, take } = parsePage(req.query);
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const where = { isDeleted: false, createdAt: { gte: since } };
  const [rows, total] = await Promise.all([
    prisma.post.findMany({
      where,
      include: postInclude,
      orderBy: [{ likeCount: 'desc' }, { commentCount: 'desc' }, { createdAt: 'desc' }],
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
    message: 'Trending posts fetched',
    data: {
      posts: rows.map((r) => serializePost(r, me, liked.has(r.id), polls.get(r.id))),
      pagination: { page, limit, total, hasMore: skip + rows.length < total },
    },
  });
}

/** POST /api/social/posts — create (1-500 chars, ≤1 photo, 10/hour rate limit). */
export async function createPost(req: AuthRequest, res: Response) {
  const me = req.userId!;
  const content = String(req.body?.content ?? '').trim();
  const photoUrl = req.body?.photoUrl ? String(req.body.photoUrl).trim() : null;
  let poll: { question: string | null; options: string[] };
  try {
    poll = parsePollInput(req.body);
  } catch (err: any) {
    return responses.badRequest(res, err?.message ?? 'Invalid poll');
  }
  const hasPoll = Boolean(poll.question && poll.options.length >= 2);

  // Text is optional when a poll carries the post; otherwise at least text or photo.
  if (!content && !photoUrl && !hasPoll) return responses.badRequest(res, 'Content is required');
  if (content.length > 500) return responses.badRequest(res, 'Content must be 500 characters or fewer');
  if (photoUrl && photoUrl.length > 2048) return responses.badRequest(res, 'Photo URL is too long');

  // Spec: max 10 posts per hour per user.
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await prisma.post.count({ where: { authorId: me, createdAt: { gte: hourAgo } } });
  if (recent >= 10) return sendError(res, 429, 'Post limit reached (10 posts per hour)');

  const hashtags = extractHashtags(content);
  const mentionedIds = await resolveMentionIds(extractMentions(content));
  const [post, author] = await prisma.$transaction([
    prisma.post.create({
      data: {
        authorId: me,
        content,
        photoUrl,
        hashtags,
        mentionedUsers: mentionedIds,
        pollQuestion: poll.question,
        pollOptions: poll.options,
      },
      include: postInclude,
    }),
    prisma.user.update({ where: { id: me }, data: { postCount: { increment: 1 } }, select: { id: true } }),
  ]);
  await bumpHashtags(hashtags);
  for (const userId of mentionedIds) {
    await notifySocial({
      userId,
      fromUserId: me,
      type: 'MENTION',
      message: 'mentioned you in a post',
      link: `/community/post/${post.id}`,
      postId: post.id,
    });
  }
  emitFeed('new_post', { post: serializePost(post, me, false), timestamp: new Date() });
  responses.created(res, 'Post created', { post: serializePost(post, me, false) });
}

/** GET /api/social/posts/:id — post with threaded comments. */
export async function getPost(req: AuthRequest, res: Response) {
  const me = req.userId!;
  const id = String(req.params.id);
  const post = await prisma.post.findUnique({ where: { id }, include: postInclude });
  if (!post) return responses.notFound(res, 'Post not found');
  if (post.isDeleted && post.authorId !== me && req.role !== 'ADMIN') {
    return responses.notFound(res, 'Post not found');
  }

  const [topLevel, liked, polls, likedCommentRows] = await Promise.all([
    prisma.comment.findMany({
      where: { postId: id, parentCommentId: null },
      include: commentInclude,
      orderBy: { createdAt: 'asc' },
    }),
    likedPostSet([id], me),
    pollVoteMap([id], me),
    prisma.like.findMany({ where: { userId: me, commentId: { not: null } }, select: { commentId: true } }),
  ]);
  const likedIds = new Set(likedCommentRows.map((r) => r.commentId).filter(Boolean) as string[]);

  res.json({
    success: true,
    statusCode: 200,
    message: 'Post fetched',
    data: {
      post: serializePost(post, me, liked.has(id), polls.get(id)),
      comments: topLevel
        .filter((c) => !c.isDeleted)
        .map((c) => serializeComment(c as CommentRow, me, likedIds, post.authorId)),
    },
  });
}

/** PATCH /api/social/posts/:id — author only, within 30 minutes of creation. */
export async function editPost(req: AuthRequest, res: Response) {
  const me = req.userId!;
  const id = String(req.params.id);
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post || post.isDeleted) return responses.notFound(res, 'Post not found');
  if (post.authorId !== me) return responses.forbidden(res, 'You can only edit your own posts');

  const ageMs = Date.now() - new Date(post.createdAt).getTime();
  if (ageMs > 30 * 60 * 1000) {
    return responses.badRequest(res, 'Posts can only be edited within 30 minutes of posting');
  }

  const content = req.body?.content !== undefined ? String(req.body.content).trim() : post.content;
  const photoUrl =
    req.body?.photoUrl !== undefined ? (req.body.photoUrl ? String(req.body.photoUrl) : null) : post.photoUrl;

  const hashtags = extractHashtags(content);
  const removedTags = post.hashtags.filter((t) => !hashtags.includes(t));
  const addedTags = hashtags.filter((t) => !post.hashtags.includes(t));
  const mentionedIds = await resolveMentionIds(extractMentions(content));

  // Poll: absent = keep; explicit null/empty = remove (votes cleared);
// question+options = replace (votes reset since option indexes shift).
  let pollData: { pollQuestion: string | null; pollOptions: string[] } | null = null;
  let clearVotes = false;
  if (req.body?.pollQuestion !== undefined || req.body?.pollOptions !== undefined) {
    let parsed: { question: string | null; options: string[] };
    try {
      parsed = parsePollInput(req.body);
    } catch (err: any) {
      return responses.badRequest(res, err?.message ?? 'Invalid poll');
    }
    const optionsChanged =
      (post.pollQuestion ?? null) !== parsed.question ||
      JSON.stringify(post.pollOptions ?? []) !== JSON.stringify(parsed.options);
    if (optionsChanged) clearVotes = true;
    pollData = { pollQuestion: parsed.question, pollOptions: parsed.options };
  }

  // Text may be cleared only when a photo or poll still carries the post.
  const finalPollQ = pollData ? pollData.pollQuestion : post.pollQuestion;
  const finalPollOpts = pollData ? pollData.pollOptions : (post.pollOptions ?? []);
  const finalHasPoll = Boolean(finalPollQ && finalPollOpts.length >= 2);
  const finalPhoto = pollData !== null || req.body?.photoUrl !== undefined ? photoUrl : post.photoUrl;
  if (!content && !finalPhoto && !finalHasPoll) return responses.badRequest(res, 'Content cannot be empty');
  if (content.length > 500) return responses.badRequest(res, 'Content must be 500 characters or fewer');

  const updated = await prisma.post.update({
    where: { id },
    data: { content, photoUrl, hashtags, mentionedUsers: mentionedIds, ...(pollData ?? {}), editedAt: new Date() },
    include: postInclude,
  });
  // Stale votes must go: option indexes shift when the poll is replaced/removed.
  if (clearVotes) await prisma.pollVote.deleteMany({ where: { postId: id } });
  await bumpHashtags(addedTags, removedTags);
  emitFeed('post_updated', { postId: id, updates: { content: updated.content, photoUrl: updated.photoUrl, hashtags, editedAt: updated.editedAt } });
  responses.ok(res, 'Post updated', { post: serializePost(updated, me, false) });
}

/** DELETE /api/social/posts/:id — /** POST /api/social/posts/photo -- upload a feed photo (multipart `photo`). */
export async function uploadPostPhoto(req: AuthRequest, res: Response) {
  const me = req.userId!;
  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file?.buffer?.length) return responses.badRequest(res, 'No photo uploaded');
  try {
    const { storePostPhoto } = await import('../services/upload.service');
    const stored = await storePostPhoto(me, file);
    responses.ok(res, 'Photo uploaded', { photoUrl: stored.url, thumbnailUrl: stored.thumbnailUrl });
  } catch (err: any) {
    const status = err?.statusCode ?? err?.status ?? 500;
    return sendError(res, status, err?.message ?? 'Photo upload failed');
  }
}

/** POST /api/social/posts/:id/vote -- cast or change a poll vote (one per user). */
export async function votePoll(req: AuthRequest, res: Response) {
  const me = req.userId!;
  const id = String(req.params.id);
  const optionIdx = Number(req.body?.optionIdx);
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post || post.isDeleted) return responses.notFound(res, 'Post not found');
  if (!post.pollQuestion || (post.pollOptions ?? []).length < 2) {
    return responses.badRequest(res, 'This post has no poll');
  }
  if (!Number.isInteger(optionIdx) || optionIdx < 0 || optionIdx >= post.pollOptions.length) {
    return responses.badRequest(res, 'Invalid poll option');
  }
  await prisma.pollVote.upsert({
    where: { postId_userId: { postId: id, userId: me } },
    update: { optionIdx },
    create: { postId: id, userId: me, optionIdx },
  });
  const polls = await pollVoteMap([id], me);
  const entry = polls.get(id) ?? { counts: [], myVote: null };
  const options = post.pollOptions.map((text, i) => ({ text, votes: entry.counts[i] ?? 0 }));
  responses.ok(res, 'Vote recorded', {
    poll: {
      question: post.pollQuestion,
      options,
      totalVotes: options.reduce((s, o) => s + o.votes, 0),
      myVote: entry.myVote,
    },
  });
}

/** DELETE /api/social/posts/:id/vote -- retract my poll vote. */
export async function unvotePoll(req: AuthRequest, res: Response) {
  const me = req.userId!;
  const id = String(req.params.id);
  const post = await prisma.post.findUnique({ where: { id }, select: { id: true, isDeleted: true } });
  if (!post || post.isDeleted) return responses.notFound(res, 'Post not found');
  await prisma.pollVote.deleteMany({ where: { postId: id, userId: me } });
  responses.ok(res, 'Vote removed', { success: true });
}

/** DELETE /api/social/posts/:id -- author or admin, soft delete. */
export async function deletePost(req: AuthRequest, res: Response) {
  const me = req.userId!;
  const id = String(req.params.id);
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post || post.isDeleted) return responses.notFound(res, 'Post not found');
  if (post.authorId !== me && req.role !== 'ADMIN') {
    return responses.forbidden(res, 'You can only delete your own posts');
  }
  await prisma.post.update({ where: { id }, data: { isDeleted: true } });
  const remaining = await prisma.post.count({
    where: { authorId: post.authorId, isDeleted: false },
  });
  await prisma.user.update({ where: { id: post.authorId }, data: { postCount: remaining } });
  emitFeed('post_deleted', { postId: id });
  responses.ok(res, 'Post deleted', { success: true });
}

/** POST /api/social/posts/:id/like — one like per user per post. */
export async function likePost(req: AuthRequest, res: Response) {
  const me = req.userId!;
  const id = String(req.params.id);
  const post = await prisma.post.findUnique({ where: { id }, include: { author: { select: { id: true, name: true } } } });
  if (!post || post.isDeleted) return responses.notFound(res, 'Post not found');

  const existing = await prisma.like.findFirst({ where: { postId: id, userId: me } });
  if (!existing) {
    await prisma.$transaction([
      prisma.like.create({ data: { postId: id, userId: me } }),
      prisma.post.update({ where: { id }, data: { likeCount: { increment: 1 } } }),
    ]);
    await notifySocial({
      userId: post.authorId,
      fromUserId: me,
      type: 'LIKE',
      message: 'liked your post',
      link: `/community/post/${id}`,
      postId: id,
    });
  }
  const fresh = await prisma.post.findUniqueOrThrow({ where: { id }, select: { likeCount: true } });
  emitFeed('post_liked', { postId: id, userId: me, likeCount: fresh.likeCount });
  responses.ok(res, 'Post liked', { likeCount: fresh.likeCount });
}

/** DELETE /api/social/posts/:id/like — remove my like. */
export async function unlikePost(req: AuthRequest, res: Response) {
  const me = req.userId!;
  const id = String(req.params.id);
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post || post.isDeleted) return responses.notFound(res, 'Post not found');

  const existing = await prisma.like.findFirst({ where: { postId: id, userId: me } });
  if (existing) {
    await prisma.$transaction([
      prisma.like.delete({ where: { id: existing.id } }),
      prisma.post.update({ where: { id }, data: { likeCount: { decrement: 1 } } }),
    ]);
  }
  const fresh = await prisma.post.findUniqueOrThrow({ where: { id }, select: { likeCount: true } });
  const floored = Math.max(0, fresh.likeCount);
  if (fresh.likeCount < 0) await prisma.post.update({ where: { id }, data: { likeCount: 0 } });
  emitFeed('post_liked', { postId: id, userId: me, likeCount: floored });
  responses.ok(res, 'Post unliked', { likeCount: floored });
}

/** POST /api/social/posts/:id/comments — create comment or threaded reply. */
export async function addComment(req: AuthRequest, res: Response) {
  const me = req.userId!;
  const postId = String(req.params.id);
  const content = String(req.body?.content ?? '').trim();
  const parentCommentId = req.body?.parentCommentId ? String(req.body.parentCommentId) : null;

  if (!content) return responses.badRequest(res, 'Content is required');
  if (content.length > 500) return responses.badRequest(res, 'Content must be 500 characters or fewer');

  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post || post.isDeleted) return responses.notFound(res, 'Post not found');

  if (parentCommentId) {
    const parent = await prisma.comment.findUnique({
      where: { id: parentCommentId },
      select: { authorId: true, postId: true },
    });
    if (!parent || parent.postId !== postId) {
      return responses.badRequest(res, 'Parent comment not found on this post');
    }
  }

  const comment = await prisma.$transaction(async (tx) => {
    const created = await tx.comment.create({
      data: { postId, authorId: me, content, parentCommentId },
      include: commentInclude,
    });
    await tx.post.update({ where: { id: postId }, data: { commentCount: { increment: 1 } } });
    return created;
  });

  const authorName =
    (await prisma.user.findUnique({ where: { id: me }, select: { name: true } }))?.name ?? 'Someone';
  if (parentCommentId) {
    const parent = await prisma.comment.findUnique({ where: { id: parentCommentId }, select: { authorId: true } });
    if (parent && parent.authorId !== me) {
      await notifySocial({
        userId: parent.authorId,
        fromUserId: me,
        type: 'COMMENT',
        message: `${authorName} replied to your comment`,
        link: `/community/post/${postId}`,
        postId,
        commentId: comment.id,
      });
    }
  }
  if (post.authorId !== me) {
    await notifySocial({
      userId: post.authorId,
      fromUserId: me,
      type: 'COMMENT',
      message: `${authorName} commented on your post`,
      link: `/community/post/${postId}`,
      postId,
      commentId: comment.id,
    });
  }
  emitFeed('new_comment', {
    postId,
    comment: serializeComment(comment as CommentRow, me, new Set(), post.authorId),
    timestamp: new Date(),
  });
  responses.created(res, 'Comment added', {
    comment: serializeComment(comment as CommentRow, me, new Set(), post.authorId),
  });
}

/** GET /api/social/posts/:id/comments — threaded, paginated (oldest first). */
export async function listComments(req: AuthRequest, res: Response) {
  const me = req.userId!;
  const postId = String(req.params.id);
  const { page, limit, skip, take } = parsePage(req.query);
  const post = await prisma.post.findUnique({ where: { id: postId }, select: { authorId: true } });
  if (!post) return responses.notFound(res, 'Post not found');

  const [rows, total, likedCommentRows] = await Promise.all([
    prisma.comment.findMany({
      where: { postId, parentCommentId: null },
      include: commentInclude,
      orderBy: { createdAt: 'asc' },
      skip,
      take,
    }),
    prisma.comment.count({ where: { postId, parentCommentId: null, isDeleted: false } }),
    prisma.like.findMany({ where: { userId: me, commentId: { not: null } }, select: { commentId: true } }),
  ]);
  const likedIds = new Set(likedCommentRows.map((r) => r.commentId).filter(Boolean) as string[]);
  res.json({
    success: true,
    statusCode: 200,
    message: 'Comments fetched',
    data: {
      comments: rows
        .filter((c) => !c.isDeleted)
        .map((c) => serializeComment(c as CommentRow, me, likedIds, post.authorId)),
      pagination: { page, limit, total, hasMore: skip + rows.length < total },
    },
  });
}

/** POST /api/social/comments/:id/like */
export async function likeComment(req: AuthRequest, res: Response) {
  const me = req.userId!;
  const id = String(req.params.id);
  const comment = await prisma.comment.findUnique({ where: { id } });
  if (!comment || comment.isDeleted) return responses.notFound(res, 'Comment not found');

  const existing = await prisma.like.findFirst({ where: { commentId: id, userId: me } });
  if (!existing) {
    await prisma.$transaction([
      prisma.like.create({ data: { commentId: id, userId: me } }),
      prisma.comment.update({ where: { id }, data: { likeCount: { increment: 1 } } }),
    ]);
    await notifySocial({
      userId: comment.authorId,
      fromUserId: me,
      type: 'LIKE',
      message: 'liked your comment',
      link: `/community/post/${comment.postId}`,
      commentId: id,
    });
  }
  const fresh = await prisma.comment.findUniqueOrThrow({ where: { id }, select: { likeCount: true } });
  emitFeed('comment_liked', { commentId: id, likeCount: fresh.likeCount });
  responses.ok(res, 'Comment liked', { likeCount: fresh.likeCount });
}

/** DELETE /api/social/comments/:id/like */
export async function unlikeComment(req: AuthRequest, res: Response) {
  const me = req.userId!;
  const id = String(req.params.id);
  const comment = await prisma.comment.findUnique({ where: { id } });
  if (!comment) return responses.notFound(res, 'Comment not found');

  const existing = await prisma.like.findFirst({ where: { commentId: id, userId: me } });
  if (existing) {
    await prisma.$transaction([
      prisma.like.delete({ where: { id: existing.id } }),
      prisma.comment.update({ where: { id }, data: { likeCount: { decrement: 1 } } }),
    ]);
  }
  const fresh = await prisma.comment.findUniqueOrThrow({ where: { id }, select: { likeCount: true } });
  const floored = Math.max(0, fresh.likeCount);
  if (fresh.likeCount < 0) await prisma.comment.update({ where: { id }, data: { likeCount: 0 } });
  emitFeed('comment_liked', { commentId: id, likeCount: floored });
  responses.ok(res, 'Comment unliked', { likeCount: floored });
}

/** DELETE /api/social/comments/:id — comment author, post author, or admin. */
export async function deleteComment(req: AuthRequest, res: Response) {
  const me = req.userId!;
  const id = String(req.params.id);
  const comment = await prisma.comment.findUnique({
    where: { id },
    include: { post: { select: { authorId: true } } },
  });
  if (!comment || comment.isDeleted) return responses.notFound(res, 'Comment not found');
  if (comment.authorId !== me && comment.post.authorId !== me && req.role !== 'ADMIN') {
    return responses.forbidden(res, 'Not allowed to delete this comment');
  }
  const replyCount = await prisma.comment.count({ where: { parentCommentId: id, isDeleted: false } });
  await prisma.$transaction([
    prisma.comment.update({ where: { id }, data: { isDeleted: true } }),
    prisma.post.update({
      where: { id: comment.postId },
      data: { commentCount: { decrement: 1 + replyCount } },
    }),
  ]);
  emitFeed('post_updated', { postId: comment.postId, updates: { commentDelta: -(1 + replyCount) } });
  responses.ok(res, 'Comment deleted', { success: true });
}
