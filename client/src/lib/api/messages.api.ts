import api from '@/lib/axios';

export const messagesApi = {
  conversations: (params?: Record<string, string | number | undefined>) => api.get('/messages/conversations', { params }),
  conversation: (applicationId: string, params?: Record<string, string | number | undefined>) =>
    api.get(`/messages/conversation/${applicationId}`, { params }),
  send: (payload: { applicationId: string; content: string }) => api.post('/messages', payload),
  markRead: (messageId: string) => api.patch(`/messages/${messageId}/read`),
  delete: (messageId: string) => api.delete(`/messages/${messageId}`),
};
