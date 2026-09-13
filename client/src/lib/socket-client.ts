import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

/**
 * Initialize socket connection
 */
export function connectSocket(token: string): Socket {
  if (socket?.connected) {
    return socket;
  }

  socket = io(process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000', {
    auth: {
      token,
    },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket?.id);
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });

  return socket;
}

/**
 * Disconnect socket
 */
export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect();
  }
  socket = null;
}

/**
 * Get socket instance
 */
export function getSocket(): Socket | null {
  return socket;
}

/**
 * Check if socket is connected
 */
export function isSocketConnected(): boolean {
  return socket?.connected ?? false;
}

/**
 * Join conversation room
 */
export function joinConversation(
  applicationId: string,
  callback?: (result: any) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!socket?.connected) {
      reject(new Error('Socket not connected'));
      return;
    }

    socket.emit('join_conversation', { applicationId }, (response: any) => {
      if (response.success) {
        callback?.(response);
        resolve();
      } else {
        reject(new Error(response.error));
      }
    });
  });
}

/**
 * Send message
 */
export function sendMessage(
  applicationId: string,
  content: string,
  callback?: (result: any) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!socket?.connected) {
      reject(new Error('Socket not connected'));
      return;
    }

    socket.emit('send_message', { applicationId, content }, (response: any) => {
      if (response.success) {
        callback?.(response);
        resolve();
      } else {
        reject(new Error(response.error));
      }
    });
  });
}

/**
 * Send typing start event
 */
export function sendTypingStart(applicationId: string): void {
  if (!socket?.connected) return;
  socket.emit('typing_start', { applicationId });
}

/**
 * Send typing stop event
 */
export function sendTypingStop(applicationId: string): void {
  if (!socket?.connected) return;
  socket.emit('typing_stop', { applicationId });
}

/**
 * Mark messages as read
 */
export function markMessagesRead(
  applicationId: string,
  callback?: (result: any) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!socket?.connected) {
      reject(new Error('Socket not connected'));
      return;
    }

    socket.emit('mark_read', { applicationId }, (response: any) => {
      if (response.success) {
        callback?.(response);
        resolve();
      } else {
        reject(new Error(response.error));
      }
    });
  });
}

/**
 * Listen for new messages
 */
export function onNewMessage(callback: (message: any) => void): void {
  if (!socket) return;
  socket.on('new_message', callback);
}

/**
 * Listen for user typing
 */
export function onUserTyping(callback: (data: any) => void): void {
  if (!socket) return;
  socket.on('user_typing', callback);
}

/**
 * Listen for user typing stopped
 */
export function onUserTypingStopped(callback: (data: any) => void): void {
  if (!socket) return;
  socket.on('user_typing_stopped', callback);
}

/**
 * Listen for messages marked as read
 */
export function onMessagesMarkedRead(callback: (data: any) => void): void {
  if (!socket) return;
  socket.on('messages_marked_read', callback);
}

/**
 * Listen for user online status
 */
export function onUserOnline(callback: (data: any) => void): void {
  if (!socket) return;
  socket.on('user_online', callback);
}

/**
 * Listen for user offline status
 */
export function onUserOffline(callback: (data: any) => void): void {
  if (!socket) return;
  socket.on('user_offline', callback);
}

/**
 * Listen for message notifications
 */
export function onMessageNotification(callback: (data: any) => void): void {
  if (!socket) return;
  socket.on('message_notification', callback);
}

/**
 * Remove all listeners
 */
export function removeAllListeners(): void {
  if (!socket) return;
  socket.removeAllListeners();
}

/**
 * Remove specific listener
 */
export function removeListener(event: string): void {
  if (!socket) return;
  socket.off(event);
}