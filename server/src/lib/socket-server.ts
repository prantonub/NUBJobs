import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import prisma from './lib/prisma';

// Track online users
const onlineUsers = new Map<string, string>(); // userId -> socketId

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

    console.log(`User connected: ${userId} (${socket.id})`);

    // Broadcast user online status
    io.emit('user_online', { userId, isOnline: true });

    // ===== MESSAGE EVENTS =====

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
    socket.on('send_message', async (data: any, callback) => {
      try {
        const { applicationId, content } = data;

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
            sender: { select: { id: true, name: true, photoUrl: true } },
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
            photoUrl: message.sender.photoUrl,
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
     * typing_start - User started typing
     */
    socket.on('typing_start', (data: { applicationId: string }) => {
      const room = `conversation_${data.applicationId}`;
      socket.to(room).emit('user_typing', {
        userId,
        applicationId: data.applicationId,
      });
    });

    /**
     * typing_stop - User stopped typing
     */
    socket.on('typing_stop', (data: { applicationId: string }) => {
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