import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { singleImage } from '../middleware/upload.middleware';
import {
  getFeed,
  getTrendingFeed,
  createPost,
  getPost,
  editPost,
  deletePost,
  likePost,
  unlikePost,
  votePoll,
  unvotePoll,
  uploadPostPhoto,
  addComment,
  listComments,
  likeComment,
  unlikeComment,
  deleteComment,
} from '../controllers/social-feed.controller';
import {
  getUserProfile,
  updateMe,
  getUserPosts,
  followUser,
  unfollowUser,
  listFollowers,
  listFollowing,
  getSuggestions,
} from '../controllers/social-profile.controller';
import {
  listConversations,
  getHistory,
  sendMessage,
  markRead,
  deleteMessage,
  unreadCount,
} from '../controllers/social-messages.controller';
import {
  listNotifications,
  markNotificationRead,
  markAllRead,
  notificationUnreadCount,
} from '../controllers/social-notifications.controller';
import {
  searchPosts,
  searchUsers,
  getHashtagPosts,
  trendingHashtags,
  reportContent,
  listCommunityPosts,
  listCommunityMembers,
  listCommunityAnnouncements,
} from '../controllers/social-search.controller';

/** Express 4 doesn't catch async rejections â€” route every handler through this. */
const wrap =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);

const router = Router();

// Every social endpoint requires an authenticated user (spec Â§AUTHORIZATION).
router.use(authenticate);

// A. Feed
router.get('/feed', wrap(getFeed));
router.get('/feed/trending', wrap(getTrendingFeed));

// B. Posts
router.post('/posts', wrap(createPost));
router.post('/posts/photo', ...singleImage('photo'), wrap(uploadPostPhoto));
router.get('/posts/:id', wrap(getPost));
router.patch('/posts/:id', wrap(editPost));
router.delete('/posts/:id', wrap(deletePost));
router.post('/posts/:id/like', wrap(likePost));
router.delete('/posts/:id/like', wrap(unlikePost));
router.post('/posts/:id/vote', wrap(votePoll));
router.delete('/posts/:id/vote', wrap(unvotePoll));

// C. Comments (literal paths registered before generic ones)
router.post('/posts/:id/comments', wrap(addComment));
router.get('/posts/:id/comments', wrap(listComments));
router.post('/comments/:id/like', wrap(likeComment));
router.delete('/comments/:id/like', wrap(unlikeComment));
router.delete('/comments/:id', wrap(deleteComment));

// D + E. Profiles & follows (/users/me before /users/:username)
router.patch('/users/me', wrap(updateMe));
router.get('/users/:username', wrap(getUserProfile));
router.get('/users/:username/posts', wrap(getUserPosts));
router.post('/users/:username/follow', wrap(followUser));
router.delete('/users/:username/follow', wrap(unfollowUser));
router.get('/users/:username/followers', wrap(listFollowers));
router.get('/users/:username/following', wrap(listFollowing));
router.get('/suggestions', wrap(getSuggestions));

// F. Messaging (literal /messages/unread-count before /messages/:userId)
router.get('/messages', wrap(listConversations));
router.get('/messages/unread-count', wrap(unreadCount));
router.get('/messages/:userId', wrap(getHistory));
router.post('/messages/:userId', wrap(sendMessage));
router.patch('/messages/:messageId/read', wrap(markRead));
router.delete('/messages/:messageId', wrap(deleteMessage));

// G. Notifications (literal paths first)
router.get('/notifications', wrap(listNotifications));
router.get('/notifications/unread-count', wrap(notificationUnreadCount));
router.patch('/notifications/read-all', wrap(markAllRead));
router.patch('/notifications/:id/read', wrap(markNotificationRead));

// H. Search & discovery
router.get('/search/posts', wrap(searchPosts));
router.get('/search/users', wrap(searchUsers));
router.get('/hashtags/:hashtag', wrap(getHashtagPosts));
router.get('/trending/hashtags', wrap(trendingHashtags));
// I. Community hub
router.get('/community/posts', wrap(listCommunityPosts));
router.get('/community/members', wrap(listCommunityMembers));
router.get('/community/announcements', wrap(listCommunityAnnouncements));

// Simple moderation
router.post('/report', wrap(reportContent));

export default router;






