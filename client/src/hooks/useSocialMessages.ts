'use client';

import api from '@/lib/axios';
import { MESSAGE_EVENTS, notifyIncoming, subscribe, subscribeAll, emitTyping } from '@/lib/socketHandlers';
import { useAuth } from '@/hooks/useAuth';
import {
  InfiniteData,
  QueryClient,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

/** Unwrap axios envelope: { success, data } → payload. */
const unwrap = (res: any) => res?.data?.data ?? res?.data;

const invalidate = (qc: QueryClient, keys: string[][]) => {
  for (const key of keys) qc.invalidateQueries({ queryKey: key });
};

const THREAD_KEYS = (userId: string) =>
  [
    ['social', 'history', userId],
    ['social', 'convs'],
    ['social', 'unreadMessages'],
    ['social', 'searchMessages'],
  ] as string[][];

// ─── Conversation list ───────────────────────────────────────────────────────

export interface ConversationsQuery {
  filter?: 'all' | 'professional' | 'community' | 'unread' | 'pinned' | 'archived';
  search?: string;
  page?: number;
}

/** GET /social/messages - filter + search run server-side (spec §5). */
export const useConversations = ({ filter = 'all', search = '', page = 1 }: ConversationsQuery = {}) =>
  useQuery({
    queryKey: ['social', 'convs', filter, search, page],
    queryFn: () =>
      api
        .get('/social/messages', { params: { filter, search: search || undefined, page, limit: 20 } })
        .then(unwrap),
    staleTime: 30_000, // spec: conversations cached 30s
  });

/** Conversation pin / archive / mute flags (per-side, spec §1/§4). */
export const useConversationFlags = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      ...flags
    }: {
      userId: string;
      pinned?: boolean;
      archived?: boolean;
      muted?: boolean;
    }) => unwrap(await api.patch(`/social/messages/${userId}/conversation`, flags)),
    onSuccess: (_data, vars) => invalidate(qc, [['social', 'convs'], ['social', 'history', vars.userId]]),
  });
};

// ─── Thread history (infinite scroll) ────────────────────────────────────────

export type HistoryPage = {
  messages: any[];
  pagination: { page: number; limit: number; total: number; hasMore: boolean };
  otherUser?: any;
  presence?: { isOnline: boolean; lastSeenAt: string | null };
  conversation?: { id: string; isPinned: boolean; isMuted: boolean; isArchived: boolean } | null;
};

/** GET /social/messages/:userId - page 1 = newest; older pages load on scroll. */
export const useMessages = (userId?: string | null) =>
  useInfiniteQuery<HistoryPage, Error, InfiniteData<HistoryPage>, readonly unknown[], number>({
    queryKey: ['social', 'history', userId],
    enabled: Boolean(userId),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      api.get(`/social/messages/${userId}`, { params: { page: pageParam, limit: 50 } }).then(unwrap),
    getNextPageParam: (last) => (last.pagination?.hasMore ? last.pagination.page + 1 : undefined),
    staleTime: 10_000, // spec: history cached 10s
  });

/** Flatten infinite pages into one chronological message array. */
export function flattenHistory(data: InfiniteData<HistoryPage> | undefined): any[] {
  if (!data) return [];
  const oldestPageFirst = [...data.pages].reverse(); // fetched newest-page first
  return oldestPageFirst.flatMap((p) => p.messages ?? []);
}

export function useHistoryMeta(data: InfiniteData<HistoryPage> | undefined) {
  return {
    otherUser: data?.pages[0]?.otherUser ?? null,
    presence: data?.pages[0]?.presence ?? null,
    conversation: data?.pages[0]?.conversation ?? null,
  };
}

// ─── Send / read / delete / pin / react ──────────────────────────────────────

export const useSendMessage = (userId?: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      content: string;
      photoUrl?: string | null;
      messageType?: string;
      tags?: string[];
      sourceId?: string;
    }) => unwrap(await api.post(`/social/messages/${userId}`, payload)),
    onSuccess: () => invalidate(qc, THREAD_KEYS(userId ?? '')),
  });
};

/** PATCH /social/messages/:id/read - recipient only. */
export const useReadMessage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) => api.patch(`/social/messages/${messageId}/read`).then(unwrap),
    onSuccess: () => invalidate(qc, [['social', 'unreadMessages'], ['social', 'convs']]),
  });
};

export const useDeleteMessage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) => api.delete(`/social/messages/${messageId}`).then(unwrap),
    onSuccess: () => invalidate(qc, [['social', 'history'], ['social', 'convs']]),
  });
};

export const usePinMessage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) => api.patch(`/social/messages/${messageId}/pin`).then(unwrap),
    onSuccess: () => invalidate(qc, [['social', 'history']]),
  });
};

export const useToggleReaction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) =>
      api.patch(`/social/messages/${messageId}/reaction`, { emoji }).then(unwrap),
    onSuccess: () => invalidate(qc, [['social', 'history']]),
  });
};

/** POST /social/messages/photo - multipart upload, returns { photoUrl }. */
export const useUploadMessagePhoto = () =>
  useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('photo', file);
      return unwrap(
        await api.post('/social/messages/photo', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      );
    },
  });

// ─── Search & unread ─────────────────────────────────────────────────────────

export const useSearchMessages = (q: string, enabled = true) =>
  useQuery({
    queryKey: ['social', 'searchMessages', q],
    queryFn: () => api.get('/social/messages/search', { params: { q } }).then(unwrap),
    enabled: enabled && q.trim().length > 0,
    staleTime: 5_000, // spec: search results not cached
  });

export const useUnreadCount = () =>
  useQuery({
    queryKey: ['social', 'unreadMessages'],
    queryFn: () => api.get('/social/messages/unread-count').then(unwrap),
    refetchInterval: 60_000,
  });

/**
 * GET /social/search/users - used by the @mention autocomplete in MessageInput.
 * Mirrors useSocial's useSearchUsers but lives on the social-messages query keys.
 */
export const useSearchUsers = (q: string, page = 1, enabled = true, limit = 10) =>
  useQuery({
    queryKey: ['social', 'mentionUsers', q, page],
    queryFn: () => api.get('/social/search/users', { params: { q, page, limit } }).then(unwrap),
    enabled: enabled && q.trim().length > 0,
    staleTime: 30_000,
  });

// ─── Notification preferences ────────────────────────────────────────────────

export interface NotifSettings {
  enableMessages: boolean;
  enableSound: boolean;
  enableEmail: boolean;
}

export const useNotificationSettings = () =>
  useQuery({
    queryKey: ['social', 'notifSettings'],
    queryFn: () => api.get('/social/settings/notifications').then(unwrap),
    staleTime: 60_000,
  });

export const useUpdateNotificationSettings = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (settings: Partial<NotifSettings>) =>
      api.patch('/social/settings/notifications', settings).then(unwrap),
    onSuccess: () => invalidate(qc, [['social', 'notifSettings']]),
  });
};

// ─── Realtime ────────────────────────────────────────────────────────────────

/** Presence for the open chat: seed from history, then follow socket events. */
export function useOnlineStatus(
  peerId?: string | null,
  seed?: { isOnline: boolean; lastSeenAt: string | null } | null
) {
  const [online, setOnline] = useState(Boolean(seed?.isOnline));
  const [lastSeen, setLastSeen] = useState<string | null>(seed?.lastSeenAt ?? null);

  useEffect(() => setOnline(Boolean(seed?.isOnline)), [seed?.isOnline]);
  useEffect(() => setLastSeen(seed?.lastSeenAt ?? null), [seed?.lastSeenAt]);

  useEffect(() => {
    if (!peerId) return;
    return subscribeAll([MESSAGE_EVENTS.userOnline, MESSAGE_EVENTS.userOffline], (payload: any) => {
      if (payload?.userId !== peerId) return;
      const isOnline = payload.isOnline !== false;
      setOnline(isOnline);
      if (!isOnline) setLastSeen(new Date().toISOString());
    });
  }, [peerId]);

  return { isOnline: online, lastSeenAt: lastSeen };
}

/** Typing indicator for the open chat (auto-expires after 3s of silence). */
export function useTypingIndicator(peerId?: string | null) {
  const [typingName, setTypingName] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!peerId) return;
    const offStart = subscribe(MESSAGE_EVENTS.typingStart, (payload: any) => {
      if (payload?.senderId && payload.senderId !== peerId) return;
      setTypingName(payload?.senderName ?? null);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setTypingName(null), 3_000);
    });
    const offStop = subscribe(MESSAGE_EVENTS.typingStop, (payload: any) => {
      if (payload?.senderId && payload.senderId !== peerId) return;
      setTypingName(null);
    });
    return () => {
      offStart();
      offStop();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [peerId]);

  const start = () => peerId && emitTyping(peerId, true);
  const stop = () => peerId && emitTyping(peerId, false);
  return { typingName, start, stop };
}

/**
 * Global message realtime (mount once per authed surface): refreshes lists +
 * badges on every relevant event and plays sound / fires a desktop notification
 * for messages addressed to me (honours saved preferences).
 */
export function useMessageRealtime() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const meId = user?.id;

  useEffect(() => {
    const sound = localStorage.getItem('nub-msg-sound') !== '0';
    const desktop = localStorage.getItem('nub-msg-desktop') === '1';
    const off = subscribeAll(
      [
        MESSAGE_EVENTS.newMessage,
        MESSAGE_EVENTS.conversationUpdate,
        MESSAGE_EVENTS.messageRead,
        MESSAGE_EVENTS.messageDeleted,
        MESSAGE_EVENTS.messageUpdated,
        MESSAGE_EVENTS.messageReaction,
        'conversation_updated',
      ],
      (payload: any) => {
        invalidate(qc, [
          ['social', 'convs'],
          ['social', 'unreadMessages'],
          ['social', 'searchMessages'],
        ]);
        // Deletes/updates/reactions touch the OPEN thread too - refresh it live
        // so a removed message disappears on both sides without a reload.
        invalidate(qc, [['social', 'history']]);
        const msg = payload?.message;
        if (msg && meId && msg.senderId !== meId) {
          notifyIncoming({
            title: payload?.fromUser?.name ?? 'New message',
            body: String(msg.content ?? 'Sent you a photo'),
            sound,
            desktop,
          });
        }
      }
    );
    return off;
  }, [qc, meId]);
}



