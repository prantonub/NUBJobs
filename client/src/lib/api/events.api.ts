import api from '@/lib/axios';

export const eventsApi = {
  list: (params?: Record<string, string | number | undefined>) => api.get('/events', { params }),
  getById: (id: string) => api.get(`/events/${id}`),
  create: (payload: Record<string, unknown>) => api.post('/events', payload),
  update: (id: string, payload: Record<string, unknown>) => api.put(`/events/${id}`, payload),
  remove: (id: string) => api.delete(`/events/${id}`),
  toggleRsvp: (id: string) => api.post(`/events/${id}/rsvp`),
  rsvps: (id: string, params?: Record<string, string | number | undefined>) => api.get(`/events/${id}/rsvps`, { params }),
  notifyEligible: (id: string) => api.post(`/events/${id}/notify-eligible`),
};
