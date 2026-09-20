import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

// ===== NOTIFICATIONS =====

/**
 * Get notifications
 */
export const useNotifications = (params?: {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}) => {
  return useQuery({
    queryKey: ['notifications', params],
    queryFn: async () => {
      const { data } = await api.get('/notifications', { params });
      return data.data;
    },
    staleTime: 2 * 60 * 1000,
  });
};

/**
 * Get unread notification count
 */
export const useUnreadCount = () => {
  return useQuery({
    queryKey: ['unreadCount'],
    queryFn: async () => {
      const { data } = await api.get('/notifications/unread-count');
      // The API responds with `{ count }`; the older shape was `unreadCount`.
      // Reading only `unreadCount` returned undefined, so the navbar badge and
      // any unread indicator could never light up.
      return data.data?.count ?? data.data?.unreadCount ?? 0;
    },
    staleTime: 1 * 60 * 1000,
  });
};

/**
 * Mark notification as read
 */
export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { data } = await api.patch(`/notifications/${notificationId}/read`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unreadCount'] });
    },
  });
};

/**
 * Mark all notifications as read
 */
export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.patch('/notifications/mark-all-read');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unreadCount'] });
    },
  });
};

/**
 * Delete notification
 */
export const useDeleteNotification = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (notificationId: string) => {
      await api.delete(`/notifications/${notificationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

// ===== MESSAGES =====

/**
 * Get conversations
 */
export const useConversations = (params?: { page?: number; limit?: number }) => {
  return useQuery({
    queryKey: ['conversations', params],
    queryFn: async () => {
      const { data } = await api.get('/messages/conversations', { params });
      return data.data;
    },
    staleTime: 2 * 60 * 1000,
  });
};

/**
 * Get conversation messages
 */
export const useConversation = (applicationId: string | null, params?: { page?: number; limit?: number }) => {
  return useQuery({
    queryKey: ['conversation', applicationId, params],
    queryFn: async () => {
      if (!applicationId) throw new Error('Application ID required');
      const { data } = await api.get(`/messages/conversation/${applicationId}`, { params });
      return data.data;
    },
    enabled: !!applicationId,
    staleTime: 30 * 1000, // Shorter stale time for messages
  });
};

/**
 * Send message
 */
export const useSendMessage = (applicationId: string | null) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (content: string) => {
      if (!applicationId) throw new Error('Application ID required');
      const { data } = await api.post('/messages', {
        applicationId,
        content,
      });
      return data.data;
    },
    onSuccess: () => {
      if (applicationId) {
        queryClient.invalidateQueries({ queryKey: ['conversation', applicationId] });
      }
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
};

/**
 * Mark message as read
 */
export const useMarkMessageRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (messageId: string) => {
      const { data } = await api.patch(`/messages/${messageId}/read`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation'] });
    },
  });
};

/**
 * Delete message
 */
export const useDeleteMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (messageId: string) => {
      await api.delete(`/messages/${messageId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation'] });
    },
  });
};