import api from '@/lib/axios';

export const notificationsApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) => api.get('/notifications', { params }),
  unreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/mark-all-read'),
  delete: (id: string) => api.delete(`/notifications/${id}`),
};
