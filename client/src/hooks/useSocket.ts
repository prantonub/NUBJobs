'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { useAuth } from './useAuth';
import {
  connectSocket,
  disconnectSocket,
  joinConversation,
  sendMessage,
  sendTypingStart,
  sendTypingStop,
  markMessagesRead,
  onNewMessage,
  onUserTyping,
  onUserTypingStopped,
  onMessagesMarkedRead,
  onUserOnline,
  onUserOffline,
  removeAllListeners,
} from '@/lib/socket-client';

export interface SocketMessage {
  id: string;
  applicationId: string;
  sender: {
    id: string;
    name: string;
    photoUrl?: string;
  };
  content: string;
  isRead: boolean;
  timestamp: Date;
}

export interface TypingUser {
  userId: string;
  applicationId: string;
}

export interface UseSocketReturn {
  socket: any;
  isConnected: boolean;
  messages: SocketMessage[];
  typingUsers: TypingUser[];
  onlineUsers: Set<string>;
  joinConversation: (applicationId: string) => Promise<void>;
  sendMessage: (applicationId: string, content: string) => Promise<void>;
  notifyTyping: (applicationId: string, isTyping: boolean) => void;
  markAsRead: (applicationId: string) => Promise<void>;
}

/**
 * useSocket - Hook to manage Socket.io connection and messaging
 */
export const useSocket = (): UseSocketReturn => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<SocketMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  const socketRef = useRef<any>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize socket connection
  useEffect(() => {
    if (!user || !user.id) return;

    const token = localStorage.getItem('accessToken');
    if (!token) return;

    try {
      const socket = connectSocket(token);
      socketRef.current = socket;
      setIsConnected(socket.connected);

      // Handle connection events
      socket.on('connect', () => setIsConnected(true));
      socket.on('disconnect', () => setIsConnected(false));

      // Handle incoming messages
      onNewMessage((message: SocketMessage) => {
        setMessages((prev) => [...prev, message]);
      });

      // Handle typing indicators
      onUserTyping((data: TypingUser) => {
        setTypingUsers((prev) => {
          const exists = prev.find((t) => t.userId === data.userId && t.applicationId === data.applicationId);
          return exists ? prev : [...prev, data];
        });
      });

      onUserTypingStopped((data: TypingUser) => {
        setTypingUsers((prev) =>
          prev.filter((t) => !(t.userId === data.userId && t.applicationId === data.applicationId))
        );
      });

      // Handle messages marked as read
      onMessagesMarkedRead((data: any) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.applicationId === data.applicationId
              ? { ...msg, isRead: true }
              : msg
          )
        );
      });

      // Handle user online/offline
      onUserOnline((data: any) => {
        setOnlineUsers((prev) => new Set([...prev, data.userId]));
      });

      onUserOffline((data: any) => {
        setOnlineUsers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(data.userId);
          return newSet;
        });
      });

      return () => {
        removeAllListeners();
        disconnectSocket();
      };
    } catch (error) {
      console.error('Failed to initialize socket:', error);
    }
  }, [user?.id]);

  // Join conversation
  const handleJoinConversation = useCallback(
    async (applicationId: string) => {
      if (!isConnected) {
        throw new Error('Socket not connected');
      }

      return await joinConversation(applicationId);
    },
    [isConnected]
  );

  // Send message
  const handleSendMessage = useCallback(
    async (applicationId: string, content: string) => {
      if (!isConnected) {
        throw new Error('Socket not connected');
      }

      return await sendMessage(applicationId, content);
    },
    [isConnected]
  );

  // Notify typing
  const handleNotifyTyping = useCallback(
    (applicationId: string, isTyping: boolean) => {
      if (!isConnected) return;

      if (isTyping) {
        sendTypingStart(applicationId);

        // Auto-stop after 3 seconds
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
          sendTypingStop(applicationId);
        }, 3000);
      } else {
        sendTypingStop(applicationId);
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
      }
    },
    [isConnected]
  );

  // Mark as read
  const handleMarkAsRead = useCallback(
    async (applicationId: string) => {
      if (!isConnected) {
        throw new Error('Socket not connected');
      }

      return await markMessagesRead(applicationId);
    },
    [isConnected]
  );

  return {
    socket: socketRef.current,
    isConnected,
    messages,
    typingUsers,
    onlineUsers,
    joinConversation: handleJoinConversation,
    sendMessage: handleSendMessage,
    notifyTyping: handleNotifyTyping,
    markAsRead: handleMarkAsRead,
  };
};