import api from '@/lib/axios';

export const messagesApi = {
  conversations: (params?: Record<string, string | number | undefined>) => api.get('/messages/conversations', { params }),
  conversation: (userId: string, params?: Record<string, string | number | undefined>) =>
    api.get(`/messages/conversation/${userId}`, { params }),
  send: (payload: { recipientId: string; content: string; jobId?: string }) => api.post('/messages/send', payload),
  markRead: (messageId: string) => api.patch(`/messages/${messageId}/read`),
  delete: (messageId: string) => api.delete(`/messages/${messageId}`),
};
