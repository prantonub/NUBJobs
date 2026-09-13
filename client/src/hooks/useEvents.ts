import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

/**
 * Get list of campus events
 */
export const useEvents = (params?: {
  status?: 'UPCOMING' | 'PAST';
  page?: number;
  limit?: number;
}) => {
  return useQuery({
    queryKey: ['events', params],
    queryFn: async () => {
      const { data } = await api.get('/events', { params });
      return data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Get single event detail
 */
export const useEventDetail = (eventId: string | null) => {
  return useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      if (!eventId) throw new Error('Event ID required');
      const { data } = await api.get(`/events/${eventId}`);
      return data.data;
    },
    enabled: !!eventId,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Create campus event (admin only)
 */
export const useCreateEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (eventData: any) => {
      const { data } = await api.post('/events', eventData);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
};

/**
 * Update event (organizer only)
 */
export const useUpdateEvent = (eventId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (eventData: any) => {
      const { data } = await api.put(`/events/${eventId}`, eventData);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
};

/**
 * Delete event (organizer only)
 */
export const useDeleteEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (eventId: string) => {
      await api.delete(`/events/${eventId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
};

/**
 * Toggle RSVP to event
 */
export const useToggleEventRsvp = (eventId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/events/${eventId}/rsvp`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
};

/**
 * Get event RSVPs (organizer only)
 */
export const useEventRsvps = (eventId: string | null, params?: { page?: number; limit?: number }) => {
  return useQuery({
    queryKey: ['eventRsvps', eventId, params],
    queryFn: async () => {
      if (!eventId) throw new Error('Event ID required');
      const { data } = await api.get(`/events/${eventId}/rsvps`, { params });
      return data.data;
    },
    enabled: !!eventId,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Notify eligible students
 */
export const useNotifyEligibleStudents = () => {
  return useMutation({
    mutationFn: async (eventId: string) => {
      const { data } = await api.post(`/events/${eventId}/notify-eligible`);
      return data.data;
    },
  });
};