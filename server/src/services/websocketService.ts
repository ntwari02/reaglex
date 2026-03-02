import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { AuthTokenPayload } from '../utils/generateToken';
import { MessageThread, Message } from '../models/MessageThread';
import { User } from '../models/User';
import mongoose from 'mongoose';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

interface SocketUser {
  userId: string;
  socketId: string;
  role: string;
}

class WebSocketService {
  private io: SocketIOServer | null = null;
  private connectedUsers: Map<string, SocketUser> = new Map(); // userId -> SocketUser

  initialize(httpServer: HttpServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    // Authentication middleware
    this.io.use((socket: AuthenticatedSocket, next: (err?: Error) => void) => {
      const handshake = socket.handshake as any;
      const token = handshake.auth?.token || handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      try {
        const decoded = jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
        socket.userId = decoded.id;
        socket.userRole = decoded.role;
        next();
      } catch (err) {
        return next(new Error('Authentication error: Invalid token'));
      }
    });

    this.io.on('connection', (socket: AuthenticatedSocket) => {
      if (!socket.userId) {
        socket.disconnect();
        return;
      }

      console.log(`User connected: ${socket.userId} (${socket.userRole})`);

      // Store user connection
      this.connectedUsers.set(socket.userId, {
        userId: socket.userId,
        socketId: socket.id,
        role: socket.userRole || 'buyer',
      });

      // Join user's personal room
      socket.join(`user:${socket.userId}`);

      // Handle inbox events
      this.setupInboxHandlers(socket);

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.userId}`);
        this.connectedUsers.delete(socket.userId!);
      });

      // Handle errors
      socket.on('error', (error: Error) => {
        console.error('Socket error:', error);
      });
    });

    console.log('✅ WebSocket server initialized');
  }

  private setupInboxHandlers(socket: AuthenticatedSocket) {
    const userId = socket.userId!;
    const userRole = socket.userRole!;

    // Join thread room to receive updates
    socket.on('join_thread', async (data: { threadId: string }) => {
      try {
        const { threadId } = data;

        if (!mongoose.Types.ObjectId.isValid(threadId)) {
          socket.emit('error', { message: 'Invalid thread ID' });
          return;
        }

        // Verify user has access to this thread
        const thread = await MessageThread.findOne({
          _id: threadId,
          $or: [{ sellerId: userId }, { buyerId: userId }],
        }).lean();

        if (!thread) {
          socket.emit('error', { message: 'Thread not found or access denied' });
          return;
        }

        socket.join(`thread:${threadId}`);
        socket.emit('joined_thread', { threadId });
      } catch (error: any) {
        console.error('Join thread error:', error);
        socket.emit('error', { message: 'Failed to join thread' });
      }
    });

    // Leave thread room
    socket.on('leave_thread', (data: { threadId: string }) => {
      socket.leave(`thread:${data.threadId}`);
      socket.emit('left_thread', { threadId: data.threadId });
    });

    /**
     * Handle typing indicator events
     * - Listens for "typing" event from client: { threadId, isTyping }
     * - Verifies user has access to the thread
     * - Gets user name from database
     * - Broadcasts to the other user in that specific conversation
     * - Emits: { threadId, userId, userName, isTyping }
     */
    socket.on('typing', async (data: { threadId: string; isTyping: boolean }) => {
      try {
        const { threadId, isTyping } = data;

        if (!mongoose.Types.ObjectId.isValid(threadId)) {
          return;
        }

        // Verify access to thread
        const thread = await MessageThread.findOne({
          _id: threadId,
          $or: [{ sellerId: userId }, { buyerId: userId }],
        }).lean();

        if (!thread) {
          return;
        }

        // Get user name from database
        let userName = 'User';
        try {
          const userDoc = await User.findById(userId).select('fullName email storeName').lean();
          if (userDoc) {
            // Use storeName for sellers, fullName for buyers, fallback to email
            userName = (userDoc as any).storeName || userDoc.fullName || userDoc.email || 'User';
          }
        } catch (userError) {
          console.error('Error fetching user name for typing indicator:', userError);
        }

        // Determine receiver ID (the other user in the conversation)
        const receiverId = thread.sellerId.toString() === userId 
          ? thread.buyerId.toString() 
          : thread.sellerId.toString();

        // Broadcast to the other user in that specific conversation
        // Emit to receiver's personal room and thread room
        socket.to(`user:${receiverId}`).emit('user_typing', {
          threadId,
          userId,
          userName,
          isTyping,
        });
        
        // Also emit to thread room for real-time updates
        socket.to(`thread:${threadId}`).emit('user_typing', {
          threadId,
          userId,
          userName,
          isTyping,
        });
      } catch (error: any) {
        console.error('Typing indicator error:', error);
      }
    });

    // Recording indicator
    socket.on('recording', async (data: { threadId: string; isRecording: boolean; duration?: number }) => {
      try {
        const { threadId, isRecording } = data;

        if (!mongoose.Types.ObjectId.isValid(threadId)) {
          return;
        }

        // Verify access
        const thread = await MessageThread.findOne({
          _id: threadId,
          $or: [{ sellerId: userId }, { buyerId: userId }],
        }).lean();

        if (!thread) {
          return;
        }

        // Emit to other users in the thread
        socket.to(`thread:${threadId}`).emit('user_recording', {
          threadId,
          userId,
          isRecording,
          duration: data.duration,
        });
      } catch (error: any) {
        console.error('Recording indicator error:', error);
      }
    });

    // File selection indicator
    socket.on('selecting_file', async (data: { threadId: string; isSelecting: boolean; fileName?: string }) => {
      try {
        const { threadId, isSelecting } = data;

        if (!mongoose.Types.ObjectId.isValid(threadId)) {
          return;
        }

        // Verify access
        const thread = await MessageThread.findOne({
          _id: threadId,
          $or: [{ sellerId: userId }, { buyerId: userId }],
        }).lean();

        if (!thread) {
          return;
        }

        // Emit to other users in the thread
        socket.to(`thread:${threadId}`).emit('user_selecting_file', {
          threadId,
          userId,
          isSelecting,
          fileName: data.fileName,
        });
      } catch (error: any) {
        console.error('File selection indicator error:', error);
      }
    });
  }

  /**
   * Emit new message to thread participants
   */
  async emitNewMessage(threadId: string, message: any) {
    if (!this.io) return;

    this.io.to(`thread:${threadId}`).emit('new_message', {
      threadId,
      message,
    });

    // Also notify users in their personal room
    const thread = await MessageThread.findById(threadId).lean();
    if (thread) {
      this.io.to(`user:${thread.sellerId}`).emit('thread_updated', {
        threadId,
        lastMessage: message,
      });
      this.io.to(`user:${thread.buyerId}`).emit('thread_updated', {
        threadId,
        lastMessage: message,
      });
    }
  }

  /**
   * Emit thread update (status change, etc.)
   */
  async emitThreadUpdate(threadId: string, update: any) {
    if (!this.io) return;

    this.io.to(`thread:${threadId}`).emit('thread_updated', {
      threadId,
      update,
    });
  }

  /**
   * Emit unread count update
   */
  emitUnreadCountUpdate(userId: string, count: number) {
    if (!this.io) return;

    this.io.to(`user:${userId}`).emit('unread_count_update', {
      count,
    });
  }

  /**
   * Get connected users count
   */
  getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  /**
   * Get socket instance (for external use)
   */
  getIO(): SocketIOServer | null {
    return this.io;
  }
}

export const websocketService = new WebSocketService();

