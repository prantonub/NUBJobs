'use client';

/**
 * Direct-messaging hooks (spec §FRONTEND HOOKS).
 *
 * Everything routes through React Query so REST history and live Socket.io
 * events land in the same cache: socket handlers invalidate query keys and
 * the UI updates without a refresh.
 */
import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { connectSocket, emitMessageRead, emitTypingStart, emitTypingStop, getSocket, isSocketConnected, onMessagingEvent } from '@/lib/socket-client';

export interface ConversationSummary {
  id: string;
  /** 'direct' → Conversation row; 'application' → legacy application thread. */
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
  blocked?: boolean;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  recipientId?: string;
  senderName: string | null;
  senderPhoto: string | null;
  content: string | null;
  timestamp: string;
  isRead: boolean;
  readAt: string | null;
  isDeleted: boolean;
}

/** GET /api/messages/conversations — paginated conversation list. */
export const useMessages = (params?: {
  page?: number;
  limit?: number;
  search?: string;
  filter?: 'all' | 'unread' | 'archived' | 'pinned';
}) => {
  return useQuery({
    queryKey: ['conversations', params],
    queryFn: async () => {
      const { data } = await api.get('/messages/conversations', { params });
      return data.data as {
        conversations: ConversationSummary[];
        pagination: { page: number; limit: number; total: number };
      };
    },
    staleTime: 15_000,
  });
};

/** GET /api/messages/conversation/:userId — one thread's history. */
export const useConversation = (userId?: string | null, params?: { page?: number; limit?: number; cursor?: string }) => {
  return useQuery({
    queryKey: ['directConversation', userId, params],
    queryFn: async () => {
      const { data } = await api.get(`/messages/conversation/${userId}`, { params });
      return data.data as {
        /** Viewer-side block state for this thread (composer lock). */
        blockedByMe?: boolean;
        otherUser: { id: string; name: string; photo: string | null; role: string; email: string };
        job: { id: string; title: string; company: string } | null;
        messages: DirectMessage[];
        pagination: { hasMore: boolean; cursor: string | null; page: number; limit: number };
      };
    },
    enabled: Boolean(userId),
    staleTime: 10_000,
    retry: false,
  });
};

/**
 * POST /api/messages/send. Pure REST — the server emits `new_message` to the
 * recipient (and their other tabs) itself, so ALSO emitting from here would
 * write the message twice. The response updates our own cache.
 */
export const useSendMessage = (recipientId?: string | null, jobId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ content }: { content: string }) => {
      const { data } = await api.post('/messages/send', { recipientId, content, jobId });
      return data.data as { message: DirectMessage };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['directConversation', recipientId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['unreadMessageCount'] });
    },
  });
};

/** PATCH /api/messages/:messageId/read — read receipt. */
export const useMarkAsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (messageId: string) => {
      emitMessageRead(messageId);
      const { data } = await api.patch(`/messages/${messageId}/read`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['unreadMessageCount'] });
      queryClient.invalidateQueries({ queryKey: ['directConversation'] });
    },
  });
};

/** PATCH /api/messages/conversation/:userId/read-all — clears unread badge. */
export const useMarkAllAsRead = (userId?: string | null) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.patch(`/messages/conversation/${userId}/read-all`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['unreadMessageCount'] });
      // Refetch the open thread too, so its messages show as read (and any
      // "seen" guard in the page effects converges instead of re-firing).
      queryClient.invalidateQueries({ queryKey: ['directConversation'] });
    },
  });
};

/** DELETE /api/messages/:messageId — soft delete (sender only). */
export const useDeleteMessage = (userId?: string | null) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (messageId: string) => {
      const { data } = await api.delete(`/messages/${messageId}`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['directConversation', userId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
};

/** PATCH /api/messages/conversation/:userId/archive */
export const useArchiveConversation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { data } = await api.patch(`/messages/conversation/${userId}/archive`);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conversations'] }),
  });
};

/** PATCH /api/messages/conversation/:userId/unarchive */
export const useUnarchiveConversation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { data } = await api.patch(`/messages/conversation/${userId}/unarchive`);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conversations'] }),
  });
};

/** PATCH /api/messages/conversation/:userId/pin — { isPinned } */
export const usePinConversation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, isPinned }: { userId: string; isPinned: boolean }) => {
      const { data } = await api.patch(`/messages/conversation/${userId}/pin`, { isPinned });
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conversations'] }),
  });
};

/** Typing indicator — fire-and-forget socket emit with manual stop. */
export const useTypingIndicator = (recipientId?: string | null) => {
  return {
    start: () => {
      if (recipientId) emitTypingStart(recipientId);
    },
    stop: () => {
      if (recipientId) emitTypingStop(recipientId);
    },
  };
};

/** POST /api/messages/block/:userId */
export const useBlockUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { data } = await api.post(`/messages/block/${userId}`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blockedUsers'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      // Refresh the open thread so its composer locks right after blocking.
      queryClient.invalidateQueries({ queryKey: ['directConversation'] });
    },
  });
};

/** DELETE /api/messages/block/:userId */
export const useUnblockUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { data } = await api.delete(`/messages/block/${userId}`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blockedUsers'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['directConversation'] });
    },
  });
};

/** GET /api/messages/search — keyword/date/sender filters. */
export const useSearchMessages = (params?: {
  keyword?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  unreadOnly?: boolean;
  page?: number;
}) => {
  return useQuery({
    queryKey: ['messageSearch', params],
    queryFn: async () => {
      const { data } = await api.get('/messages/search', { params });
      return data.data as {
        messages: Array<
          DirectMessage & { otherUserId: string | null; otherUserName: string | null; conversationId: string | null }
        >;
        pagination: { page: number; limit: number; total: number };
      };
    },
    enabled: Boolean(params?.keyword || params?.userId || params?.dateFrom),
    staleTime: 30_000,
  });
};

/** GET /api/messages/unread-count — navbar/sidebar badge. */
export const useGetUnreadCount = () => {
  return useQuery({
    queryKey: ['unreadMessageCount'],
    queryFn: async () => {
      const { data } = await api.get('/messages/unread-count');
      return (data.data?.unreadCount ?? 0) as number;
    },
    staleTime: 30_000,
    // Safety net: socket reconnection gives up after 5 attempts, so if the
    // realtime bridge dies the "(1)" pill still refreshes once a minute.
    refetchInterval: 60_000,
  });
};

/** GET /api/messages/blocked — blocked-users list. */
export const useBlockedUsers = () => {
  return useQuery({
    queryKey: ['blockedUsers'],
    queryFn: async () => {
      const { data } = await api.get('/messages/blocked');
      return (data.data?.blockedUsers ?? []) as Array<{
        userId: string;
        name: string;
        photo: string | null;
        role: string;
        reason: string | null;
        blockedAt: string;
      }>;
    },
  });
};

/**
 * A hard refresh never dials the socket on its own (AuthContext only connects
 * on login/OAuth handoff), and `onMessagingEvent` silently no-ops without one.
 * Realtime surfaces call this first so their subscriptions actually fire.
 */
export function ensureMessagingSocket() {
  let socket = getSocket();
  if (!socket && typeof window !== 'undefined') {
    const token = window.localStorage.getItem('token');
    if (token) socket = connectSocket(token);
  }
  return socket;
}

/**
 * Keeps the "(1)" unread pill live on every authenticated surface.
 *
 * `useSocket` only mounts on the messages pages, so without this the sidebar
 * badge would sit stale until the next refetch when a student/employer message
 * arrives while you are on the dashboard. It invalidates the same queries
 * `new_message` touches so the nav pill and the conversation rows always agree.
 */
export function useUnreadBadgeRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    ensureMessagingSocket();
    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ['unreadMessageCount'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    };
    const subs = [
      onMessagingEvent('new_message', invalidate),
      onMessagingEvent('message_read', invalidate),
      onMessagingEvent('conversation_read', invalidate),
    ];
    return () => subs.forEach((off) => off());
  }, [queryClient]);
}

/**
 * useSocket() (spec §FRONTEND HOOKS) — mounts the direct-messaging server
 * event listeners for the current session:
 *   new_message → invalidate thread + list + badge
 *   message_read / conversation_read → refresh receipts
 *   typing_indicator / stop_typing → expose `typing` for the open chat
 *   user_online / user_offline → online set
 *   message_deleted / conversation_archived / notification → invalidate
 * Call once per mounted messaging surface; all handlers self-remove.
 */
export function useSocket(otherUserId?: string | null) {
  const queryClient = useQueryClient();
  const [typing, setTyping] = useState<{ senderId: string; senderName?: string } | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Hard refreshes never dial the socket by themselves — subscriptions made
    // before it exists would silently no-op.
    ensureMessagingSocket();
    const subs: Array<() => void> = [];

    subs.push(
      onMessagingEvent('new_message', (payload: any) => {
        const convId = payload?.message?.conversationId;
        const senderId = payload?.message?.senderId;
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
        queryClient.invalidateQueries({ queryKey: ['unreadMessageCount'] });
        if (senderId === otherUserId || payload?.applicationId) {
          queryClient.invalidateQueries({ queryKey: ['directConversation', otherUserId] });
        }
        if (convId) queryClient.invalidateQueries({ queryKey: ['directConversation'] });
      })
    );

    subs.push(
      onMessagingEvent('message_read', () => {
        queryClient.invalidateQueries({ queryKey: ['directConversation'] });
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      })
    );
    subs.push(
      onMessagingEvent('conversation_read', () => {
        queryClient.invalidateQueries({ queryKey: ['directConversation'] });
      })
    );

    subs.push(
      onMessagingEvent('typing_indicator', (payload: any) => {
        if (payload?.senderId && payload.senderId !== otherUserId) return;
        setTyping({ senderId: payload?.senderId ?? '', senderName: payload?.senderName });
      })
    );
    subs.push(
      onMessagingEvent('stop_typing', (payload: any) => {
        if (payload?.senderId && payload.senderId !== otherUserId) return;
        setTyping(null);
      })
    );

    subs.push(
      onMessagingEvent('user_online', (payload: any) => {
        if (payload?.userId) setOnlineUsers((prev) => new Set(prev).add(payload.userId));
      })
    );
    subs.push(
      onMessagingEvent('user_offline', (payload: any) => {
        if (payload?.userId)
          setOnlineUsers((prev) => {
            const next = new Set(prev);
            next.delete(payload.userId);
            return next;
          });
      })
    );

    subs.push(
      onMessagingEvent('message_deleted', () => {
        queryClient.invalidateQueries({ queryKey: ['directConversation'] });
      })
    );
    subs.push(
      onMessagingEvent('conversation_archived', () => {
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      })
    );
    subs.push(
      onMessagingEvent('notification', () => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['unreadCount'] });
      })
    );

    // Typing clears itself if the user stops (server has no timer).
    return () => subs.forEach((off) => off());
  }, [otherUserId, queryClient]);

  const isOnline = useCallback((userId: string) => onlineUsers.has(userId), [onlineUsers]);

  return { typing, isOnline, onlineUsers, isConnected: isSocketConnected() };
}



