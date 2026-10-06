import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import prisma from './prisma';

// Track online users
const onlineUsers = new Map<string, string>(); // userId -> socketId

/**
 * Module-level handle to the Socket.io server.
 *
 * HTTP controllers need to push events (new application, status change) to a
 * specific user, and they only ever see `req`/`res` — not the socket server. A
 * module-level reference (set in `initializeSocket`) is the standard way to
 * bridge that gap without threading `io` through every controller.
 */
let ioInstance: Server | null = null;

/** Per-user room so a user receives events on every open tab/device. */
export const userRoom = (userId: string) => `user_${userId}`;

/** Room that both participants of an application (conversation) join. */
export const conversationRoom = (applicationId: string) => `conversation_${applicationId}`;

/** The live Socket.io server, or `null` before/without `initializeSocket`. */
export function getIO(): Server | null {
  return ioInstance;
}

/**
 * Push an event to every open socket of one user.
 * Safe to call when Socket.io is not running (e.g. unit tests, scripts).
 */
export function emitToUser(userId: string, event: string, payload: unknown): boolean {
  if (!ioInstance || !userId) return false;
  ioInstance.to(userRoom(userId)).emit(event, payload);
  return true;
}

/**
 * Initialize Socket.io server
 */
export function initializeSocket(app: any) {
  const httpServer = createServer(app);

  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  ioInstance = io;

  // Middleware: JWT authentication
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      socket.data.userId = decoded.userId;
      socket.data.email = decoded.email;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId;
    onlineUsers.set(userId, socket.id);

    // Join a personal room so HTTP controllers can target this user with
    // `emitToUser(userId, ...)` even when they don't know the socket id.
    socket.join(userRoom(userId));

    console.log(`User connected: ${userId} (${socket.id})`);

    // Broadcast user online status
    io.emit('user_online', { userId, isOnline: true });

    // ===== MESSAGE EVENTS =====

    /**
     * Direct-messaging send (spec §EMIT send_message).
     * Payload: { recipientId, content, jobId? } — dispatched by payload shape
     * so the legacy applicationId handler below keeps working unchanged.
     */
    socket.on(
      'send_message',
      async (data: { recipientId?: string; applicationId?: string; content?: string; jobId?: string }) => {
        if (!data?.recipientId || !data?.content) return; // legacy path owns this call
        try {
          const senderId = userId;
          const recipientId = String(data.recipientId);
          const content = String(data.content).trim();
          if (!content || content.length > 5000 || recipientId === senderId) {
            socket.emit('error', { message: 'Invalid message' });
            return;
          }

          // Reuse the HTTP pipeline so validation, block checks, rate limit,
          // conversation update, new_message emit and offline notification are
          // identical no matter which transport delivered the message.
          const sender = await prisma.user.findUnique({
            where: { id: senderId },
            select: { name: true },
          });
          const recipient = await prisma.user.findUnique({
            where: { id: recipientId },
            select: { id: true },
          });
          if (!recipient) {
            socket.emit('error', { message: 'Recipient not found' });
            return;
          }

          const block = await prisma.blockedUser.findFirst({
            where: {
              OR: [
                { blockerId: senderId, blockedId: recipientId },
                { blockerId: recipientId, blockedId: senderId },
              ],
            },
          });
          if (block) {
            socket.emit('error', { message: 'Messaging blocked between these users' });
            return;
          }

          // Canonical pair ordering mirrors the controller.
          const [user1Id, user2Id] = senderId < recipientId ? [senderId, recipientId] : [recipientId, senderId];
          let conv = await prisma.conversation.findUnique({
            where: { user1Id_user2Id: { user1Id, user2Id } },
          });
          if (!conv) {
            conv = await prisma.conversation.create({
              data: { user1Id, user2Id, jobId: data.jobId || undefined },
            });
          }

          const message = await prisma.message.create({
            data: {
              conversationId: conv.id,
              senderId,
              recipientId,
              content,
              isRead: false,
            },
          });
          await prisma.conversation.update({
            where: { id: conv.id },
            data: { lastMessage: content.slice(0, 500), lastMessageTime: message.createdAt },
          });

          const payload = {
            message: {
              id: message.id,
              conversationId: conv.id,
              senderId,
              recipientId,
              content,
              timestamp: message.createdAt,
              isRead: false,
            },
            sender: { id: senderId, name: sender?.name ?? 'Someone' },
            timestamp: message.createdAt,
          };
          // Deliver to every open tab of the recipient (personal room).
          io.to(userRoom(recipientId)).emit('new_message', payload);
          // Echo to the sender's other tabs so they stay in sync.
          socket.emit('new_message', payload);

          // Offline → DB notification + notification event (spec §side effects).
          if (!onlineUsers.has(recipientId)) {
            await prisma.notification
              .create({
                data: {
                  userId: recipientId,
                  type: 'NEW_MESSAGE',
                  message: `New message from ${sender?.name ?? 'Someone'}`,
                  link: `/messages?user=${senderId}`,
                },
              })
              .catch(() => undefined);
            io.to(userRoom(recipientId)).emit('notification', {
              type: 'NEW_MESSAGE',
              message: `New message from ${sender?.name ?? 'Someone'}`,
              data: { messageId: message.id, senderId },
            });
          }
        } catch (error) {
          console.error('send_message error:', error);
          socket.emit('error', { message: 'Failed to send message' });
        }
      }
    );

    /**
     * Read receipt (spec §EMIT message_read).
     * Payload: { messageId } — the legacy handler below takes { applicationId }.
     */
    socket.on('message_read', async (data: { messageId?: string }) => {
      if (!data?.messageId) return; // legacy application flow
      try {
        const message = await prisma.message.findUnique({ where: { id: data.messageId } });
        if (!message || message.recipientId !== userId) return;
        if (!message.isRead) {
          await prisma.message.update({
            where: { id: message.id },
            data: { isRead: true, readAt: new Date() },
          });
        }
        const readAt = new Date();
        io.to(userRoom(message.senderId)).emit('message_read', {
          messageId: message.id,
          conversationId: message.conversationId,
          readAt,
        });
      } catch (error) {
        console.error('message_read error:', error);
      }
    });

    /**
     * join_conversation - Join a conversation room
     */
    socket.on('join_conversation', async (data: { applicationId: string }, callback) => {
      try {
        const { applicationId } = data;

        // Validate user is participant in conversation
        const application = await prisma.application.findUnique({
          where: { id: applicationId },
          include: {
            student: { select: { userId: true } },
            job: { include: { employer: { select: { userId: true } } } },
          },
        });

        if (!application) {
          return callback({ success: false, error: 'Conversation not found' });
        }

        const isStudent = application.student.userId === userId;
        const isEmployer = application.job.employer.userId === userId;

        if (!isStudent && !isEmployer) {
          return callback({ success: false, error: 'Not participant' });
        }

        // Join room
        const room = `conversation_${applicationId}`;
        socket.join(room);

        // Notify others in room
        socket.to(room).emit('user_joined', {
          userId,
          applicationId,
          timestamp: new Date(),
        });

        callback({ success: true, room });
      } catch (error) {
        console.error('Error joining conversation:', error);
        callback({ success: false, error: 'Failed to join conversation' });
      }
    });

    /**
     * send_message - Send a message in conversation
     */
    socket.on('send_message', async (data: any, callback: (r: any) => void = () => {}) => {
      const ack = typeof callback === 'function' ? callback : () => {};
      try {
        const { applicationId, content } = data;
        if (!applicationId) return; // spec payload ({ recipientId }) — other listener's job

        // Validate user is participant
        const application = await prisma.application.findUnique({
          where: { id: applicationId },
          include: {
            student: { select: { userId: true, user: { select: { name: true } } } },
            job: { include: { employer: { select: { userId: true, companyName: true } } } },
          },
        });

        if (!application) {
          return callback({ success: false, error: 'Conversation not found' });
        }

        const isStudent = application.student.userId === userId;
        const isEmployer = application.job.employer.userId === userId;

        if (!isStudent && !isEmployer) {
          return callback({ success: false, error: 'Not participant' });
        }

        // Save message to database
        const message = await prisma.message.create({
          data: {
            applicationId,
            senderId: userId,
            content,
            isRead: false,
          },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                studentProfile: {
                  select: {
                    photoUrl: true,
                  },
                },
              },
            },
          },
        });

        // Emit to room
        const room = `conversation_${applicationId}`;
        io.to(room).emit('new_message', {
          id: message.id,
          applicationId,
          sender: {
            id: message.sender.id,
            name: message.sender.name,
            photoUrl: message.sender.studentProfile?.photoUrl || null,
          },
          content: message.content,
          isRead: message.isRead,
          timestamp: message.createdAt,
        });

        // Create notification for other party
        const otherUserId = isStudent ? application.job.employer.userId : application.student.userId;
        const senderName = isStudent ? application.student.user.name : application.job.employer.companyName;

        await prisma.notification.create({
          data: {
            userId: otherUserId,
            type: 'NEW_MESSAGE',
            message: `New message from ${senderName}`,
            link: `/messages/${applicationId}`,
          },
        });

        // Notify other user if online
        const otherSocketId = onlineUsers.get(otherUserId);
        if (otherSocketId) {
          io.to(otherSocketId).emit('message_notification', {
            applicationId,
            senderName,
          });
        }

        callback({ success: true, message });
      } catch (error) {
        console.error('Error sending message:', error);
        callback({ success: false, error: 'Failed to send message' });
      }
    });

    /**
     * typing_start - User started typing.
     * Spec payload: { recipientId } → direct-messaging `typing_indicator`.
     * Legacy payload: { applicationId } → room-based `user_typing`.
     */
    socket.on('typing_start', (data: { recipientId?: string; applicationId?: string }) => {
      if (data?.recipientId) {
        io.to(userRoom(data.recipientId)).emit('typing_indicator', {
          senderId: userId,
          senderName: socket.data.email ?? 'Someone',
        });
        return;
      }
      const room = `conversation_${data.applicationId}`;
      socket.to(room).emit('user_typing', {
        userId,
        applicationId: data.applicationId,
      });
    });

    /**
     * typing_stop - User stopped typing.
     * Spec payload: { recipientId } → `stop_typing`; legacy: { applicationId }.
     */
    socket.on('typing_stop', (data: { recipientId?: string; applicationId?: string }) => {
      if (data?.recipientId) {
        io.to(userRoom(data.recipientId)).emit('stop_typing', { senderId: userId });
        return;
      }
      const room = `conversation_${data.applicationId}`;
      socket.to(room).emit('user_typing_stopped', {
        userId,
        applicationId: data.applicationId,
      });
    });

    /**
     * mark_read - Mark messages as read
     */
    socket.on('mark_read', async (data: { applicationId: string }, callback) => {
      try {
        const { applicationId } = data;

        // Mark all messages from other users as read
        await prisma.message.updateMany({
          where: {
            applicationId,
            senderId: { not: userId },
            isRead: false,
          },
          data: { isRead: true },
        });

        // Emit to room
        const room = `conversation_${applicationId}`;
        io.to(room).emit('messages_marked_read', {
          userId,
          applicationId,
        });

        callback({ success: true });
      } catch (error) {
        console.error('Error marking messages as read:', error);
        callback({ success: false, error: 'Failed to mark as read' });
      }
    });

    // ===== DISCONNECT =====

    /**
     * disconnect - User disconnected
     */
    socket.on('disconnect', () => {
      onlineUsers.delete(userId);
      console.log(`User disconnected: ${userId}`);

      // Broadcast user offline status
      io.emit('user_offline', { userId, isOnline: false });
    });

    // ===== CONNECTION HEARTBEAT =====

    /**
     * ping - Keep connection alive
     */
    socket.on('ping', () => {
      socket.emit('pong');
    });
  });

  return { httpServer, io };
}

/**
 * Get online status of user
 */
export function isUserOnline(userId: string): boolean {
  return onlineUsers.has(userId);
}

/**
 * Get all online users
 */
export function getOnlineUsers(): string[] {
  return Array.from(onlineUsers.keys());
}