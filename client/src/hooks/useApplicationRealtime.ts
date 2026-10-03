'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { connectSocket, getSocket } from '@/lib/socket-client';
import { useAuth } from './useAuth';

export type ApplicationRealtimeRole = 'STUDENT' | 'EMPLOYER';

const EMPLOYER_KEYS = [
  'employerApplications',
  'employerApplicationsList',
  'employerApplication',
  'employerJobs',
  'employerJob',
  'jobApplications',
  'applications',
  'applicationStats',
  'employerStats',
  'companyStats',
  'companyAnalytics',
  'notifications',
  'unreadCount',
];

const STUDENT_KEYS = ['applications', 'applicationStats', 'application', 'notifications', 'unreadCount'];

/**
 * Bridges the application Socket.io events into React Query:
 *   - `new_application`            → employer pipeline / list / badges refresh
 *   - `application_status_changed` → student dashboard + detail refresh
 *
 * The socket is only dialled on login/register in `AuthContext`, so when a page
 * is opened directly (hard refresh) this hook establishes it as well.
 */
export function useApplicationRealtime(role: ApplicationRealtimeRole) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    let socket = getSocket();
    if (!socket && typeof window !== 'undefined') {
      const token = window.localStorage.getItem('token');
      if (token) socket = connectSocket(token);
    }
    if (!socket) return;

    const invalidate = (keys: string[]) => {
      keys.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
    };

    const handleNewApplication = (payload?: { studentName?: string; matchScore?: number }) => {
      invalidate(EMPLOYER_KEYS);
      if (role === 'EMPLOYER') {
        toast.info(
          payload?.studentName
            ? `New application from ${payload.studentName}${
                typeof payload.matchScore === 'number' ? ` · ${payload.matchScore}% match` : ''
              }`
            : 'New application received'
        );
      }
    };

    const handleStatusChanged = (payload?: { status?: string; jobTitle?: string }) => {
      invalidate(STUDENT_KEYS);
      invalidate(EMPLOYER_KEYS);
      if (role === 'STUDENT' && payload?.status) {
        toast.info(
          `Application update: ${payload.status}${payload.jobTitle ? ` · ${payload.jobTitle}` : ''}`
        );
      }
    };

    socket.on('new_application', handleNewApplication);
    socket.on('application_status_changed', handleStatusChanged);

    return () => {
      socket?.off('new_application', handleNewApplication);
      socket?.off('application_status_changed', handleStatusChanged);
    };
  }, [queryClient, role, user]);
}
