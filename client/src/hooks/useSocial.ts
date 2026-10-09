import api from '@/lib/axios';
import { getSocket } from '@/lib/socket-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React from 'react';

/** Unwrap axios envelope: { success, data } → payload. */
const unwrap = (res: any) => res?.data?.data ?? res?.data;

/** Generic mutation that invalidates query keys on success. */
function socialMutation<TVars>(fn: (v: TVars) => Promise<any>, invalidate: string[][] = [['social']]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: TVars) => unwrap(await fn(v)),
    onSuccess: () => {
      for (const key of invalidate) qc.invalidateQueries({ queryKey: key });
    },
  });
}

// ─── Feed & posts ────────────────────────────────────────────────────────────

export const useFeed = (page = 1) =>
  useQuery({
    queryKey: ['social', 'feed', page],
    queryFn: () => api.get('/social/feed', { params: { page, limit: 20 } }).then(unwrap),
  });

export const useTrendingFeed = (page = 1) =>
  useQuery({
    queryKey: ['social', 'trending', page],
    queryFn: () => api.get('/social/feed/trending', { params: { page, limit: 20 } }).then(unwrap),
  });

export const usePost = (postId?: string) =>
  useQuery({
    queryKey: ['social', 'post', postId],
    queryFn: () => api.get(`/social/posts/${postId}`).then(unwrap),
    enabled: Boolean(postId),
  });

export const useCreatePost = () =>
  socialMutation<{ content: string; photoUrl?: string | null; pollQuestion?: string; pollOptions?: string[] }>(
    (v) => api.post('/social/posts', v),
    [['social']]
  );

export const useEditPost = (postId: string) =>
  socialMutation<{ content: string; photoUrl?: string | null; pollQuestion?: string | null; pollOptions?: string[] }>(
    (v) => api.patch(`/social/posts/${postId}`, v),
    [['social'], ['social', 'post', postId]]
  );

export const useDeletePost = () =>
  socialMutation<string>((postId) => api.delete(`/social/posts/${postId}`), [['social']]);

export interface SocialPoll {
  question: string;
  options: { text: string; votes: number }[];
  totalVotes: number;
  myVote: number | null;
}

/** Cast a poll vote (POST) or retract it (DELETE via optionIdx null). */
export const useVotePoll = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, optionIdx }: { postId: string; optionIdx: number | null }) =>
      unwrap(
        await (optionIdx === null
          ? api.delete(`/social/posts/${postId}/vote`)
          : api.post(`/social/posts/${postId}/vote`, { optionIdx }))
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['social'] });
    },
  });
};

/** Toggle like; optimistic count update on the given query keys. */
export const useLikePost = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, liked }: { postId: string; liked: boolean }) =>
      unwrap(
        await (liked
          ? api.delete(`/social/posts/${postId}/like`)
          : api.post(`/social/posts/${postId}/like`))
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['social'] });
    },
  });
};

// ─── Comments ────────────────────────────────────────────────────────────────

export const useComments = (postId?: string, page = 1) =>
  useQuery({
    queryKey: ['social', 'comments', postId, page],
    queryFn: () => api.get(`/social/posts/${postId}/comments`, { params: { page, limit: 20 } }).then(unwrap),
    enabled: Boolean(postId),
  });

export const useCreateComment = (postId: string) =>
  socialMutation<{ content: string; parentCommentId?: string }>(
    (v) => api.post(`/social/posts/${postId}/comments`, v),
    [['social'], ['social', 'post', postId], ['social', 'comments', postId]]
  );

export const useDeleteComment = (postId: string) =>
  socialMutation<string>(
    (commentId) => api.delete(`/social/comments/${commentId}`),
    [['social'], ['social', 'post', postId], ['social', 'comments', postId]]
  );

export const useLikeComment = (postId: string) =>
  socialMutation<{ commentId: string; liked: boolean }>(
    ({ commentId, liked }) =>
      liked
        ? api.delete(`/social/comments/${commentId}/like`)
        : api.post(`/social/comments/${commentId}/like`),
    [['social'], ['social', 'comments', postId], ['social', 'post', postId]]
  );

// ─── Profiles & follows ──────────────────────────────────────────────────────

export const useUserProfile = (username?: string) =>
  useQuery({
    queryKey: ['social', 'profile', username],
    queryFn: () => api.get(`/social/users/${username}`).then(unwrap),
    enabled: Boolean(username),
  });

export const useUpdateProfile = () =>
  socialMutation<{ photo?: string | null; bio?: string; location?: string; website?: string }>(
    (v) => api.patch('/social/users/me', v),
    [['social'], ['auth']]
  );

export const useUserPosts = (username?: string, page = 1) =>
  useQuery({
    queryKey: ['social', 'userPosts', username, page],
    queryFn: () => api.get(`/social/users/${username}/posts`, { params: { page, limit: 10 } }).then(unwrap),
    enabled: Boolean(username),
  });

/** Pass { following: isFollowing } when the button is in Following state (click = unfollow). */
export const useFollow = (username?: string) =>
  socialMutation<boolean>(
    (following) =>
      following
        ? api.delete(`/social/users/${username}/follow`)
        : api.post(`/social/users/${username}/follow`),
    [['social']]
  );

export const useFollowers = (username?: string, page = 1) =>
  useQuery({
    queryKey: ['social', 'followers', username, page],
    queryFn: () =>
      api.get(`/social/users/${username}/followers`, { params: { page, limit: 50 } }).then(unwrap),
    enabled: Boolean(username),
  });

export const useFollowing = (username?: string, page = 1) =>
  useQuery({
    queryKey: ['social', 'following', username, page],
    queryFn: () =>
      api.get(`/social/users/${username}/following`, { params: { page, limit: 50 } }).then(unwrap),
    enabled: Boolean(username),
  });

export const useFollowSuggestions = (limit = 5) =>
  useQuery({
    queryKey: ['social', 'suggestions', limit],
    queryFn: () => api.get('/social/suggestions', { params: { limit } }).then(unwrap),
  });

// ─── Messaging (social endpoints) ────────────────────────────────────────────

export const useConversations = (page = 1) =>
  useQuery({
    queryKey: ['social', 'conversations', page],
    queryFn: () => api.get('/social/messages', { params: { page, limit: 20 } }).then(unwrap),
  });

export const useMessageHistory = (userId?: string, page = 1) =>
  useQuery({
    queryKey: ['social', 'history', userId, page],
    queryFn: () => api.get(`/social/messages/${userId}`, { params: { page, limit: 50 } }).then(unwrap),
    enabled: Boolean(userId),
  });

export const useSendMessage = (userId: string) =>
  socialMutation<{ content: string; photoUrl?: string | null }>(
    (v) => api.post(`/social/messages/${userId}`, v),
    [['social', 'conversations'], ['social', 'history', userId]]
  );

export const useReadMessage = () =>
  socialMutation<string>((messageId) => api.patch(`/social/messages/${messageId}/read`), [
    ['social', 'conversations'],
    ['messages'],
  ]);

export const useSocialUnreadMessages = () =>
  useQuery({
    queryKey: ['social', 'unreadMessages'],
    queryFn: () => api.get('/social/messages/unread-count').then(unwrap),
    refetchInterval: 60_000,
  });

// ─── Notifications ───────────────────────────────────────────────────────────

export const useNotifications = (page = 1) =>
  useQuery({
    queryKey: ['social', 'notifications', page],
    queryFn: () => api.get('/social/notifications', { params: { page, limit: 20 } }).then(unwrap),
  });

export const useReadNotification = () =>
  socialMutation<string>((id) => api.patch(`/social/notifications/${id}/read`), [
    ['social', 'notifications'],
  ]);

export const useReadAllNotifications = () =>
  socialMutation<void>(() => api.patch('/social/notifications/read-all'), [
    ['social', 'notifications'],
  ]);

export const useUnreadNotifications = () =>
  useQuery({
    queryKey: ['social', 'unreadNotifications'],
    queryFn: () => api.get('/social/notifications/unread-count').then(unwrap),
    refetchInterval: 60_000,
  });

// ─── Search & discovery ──────────────────────────────────────────────────────

export const useSearchPosts = (q: string, hashtag?: string, page = 1, enabled = true) =>
  useQuery({
    queryKey: ['social', 'searchPosts', q, hashtag, page],
    queryFn: () =>
      api.get('/social/search/posts', { params: { q, hashtag, page, limit: 20 } }).then(unwrap),
    enabled: enabled && (Boolean(q) || Boolean(hashtag)),
  });

export const useSearchUsers = (q: string, page = 1, enabled = true) =>
  useQuery({
    queryKey: ['social', 'searchUsers', q, page],
    queryFn: () => api.get('/social/search/users', { params: { q, page, limit: 20 } }).then(unwrap),
    enabled: enabled && Boolean(q),
  });

export const useHashtagPosts = (hashtag?: string, page = 1) =>
  useQuery({
    queryKey: ['social', 'hashtag', hashtag, page],
    queryFn: () => api.get(`/social/hashtags/${hashtag}`, { params: { page, limit: 20 } }).then(unwrap),
    enabled: Boolean(hashtag),
  });

export const useTrendingHashtags = (limit = 5) =>
  useQuery({
    queryKey: ['social', 'hashtags', limit],
    queryFn: () => api.get('/social/trending/hashtags', { params: { limit } }).then(unwrap),
  });

export const useReportContent = () =>
  socialMutation<{
    contentType: 'post' | 'comment' | 'user';
    contentId: string;
    reason: string;
    description?: string;
  }>((v) => api.post('/social/report', v), []);

// ─── Realtime: invalidate caches when social socket events arrive ───────────

const SOCIAL_EVENTS = [
  'new_post',
  'post_updated',
  'post_deleted',
  'post_liked',
  'new_comment',
  'comment_liked',
  'new_follow',
  'follower_count_updated',
  'new_notification',
] as const;

/** Subscribes to social feed events and refreshes React Query caches. */
export function useSocialSocket() {
  const qc = useQueryClient();
  React.useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handler = () => {
      for (const key of [
        ['social', 'feed'],
        ['social', 'trending'],
        ['social', 'notifications'],
        ['social', 'unreadNotifications'],
        ['social', 'suggestions'],
      ]) {
        qc.invalidateQueries({ queryKey: key });
      }
    };
    for (const event of SOCIAL_EVENTS) socket.on(event, handler);
    return () => {
      for (const event of SOCIAL_EVENTS) socket.off(event, handler);
    };
  }, [qc]);
}

/** Community endpoints (feed, members, announcements, posts). */
export const useCommunityPosts = (page = 1) =>
  useQuery({
    queryKey: ['social', 'communityPosts', page],
    queryFn: () => api.get('/social/community/posts', { params: { page, limit: 20 } }).then(unwrap),
  });

export const useCommunityMembers = (page = 1) =>
  useQuery({
    queryKey: ['social', 'communityMembers', page],
    queryFn: () => api.get('/social/community/members', { params: { page, limit: 50 } }).then(unwrap),
  });

export const useCommunityAnnouncements = (page = 1) =>
  useQuery({
    queryKey: ['social', 'communityAnnouncements', page],
    queryFn: () => api.get('/social/community/announcements', { params: { page, limit: 10 } }).then(unwrap),
  });

