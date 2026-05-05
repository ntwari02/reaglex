/**
 * WebSocket Service — port of client `websocketService.ts` (Socket.IO).
 */
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { getAuthTokenSync } from '../storage/authMemory';
import { getSocketUrl } from '../lib/config';

const WS_URL = getSocketUrl();

class WebSocketService {
  private socket: Socket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(): void {
    const token = getAuthTokenSync();

    if (!token) {
      console.warn('No auth token found, cannot connect to WebSocket');
      return;
    }

    if (this.socket?.connected) {
      console.log('WebSocket already connected');
      return;
    }

    this.socket = io(WS_URL, {
      auth: { token },
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.onConnect?.();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.isConnected = false;
      this.onDisconnect?.(reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.reconnectAttempts++;
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.onMaxReconnectAttempts?.();
      }
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.onError?.(error);
    });

    this.socket.on('new_message', (data: { threadId: string; message: unknown }) => {
      this.onNewMessage?.(data.threadId, data.message);
    });

    this.socket.on(
      'thread_updated',
      (data: { threadId: string; update?: unknown; lastMessage?: unknown }) => {
        this.onThreadUpdate?.(data.threadId, data.update, data.lastMessage);
      },
    );

    this.socket.on(
      'user_typing',
      (data: { threadId: string; userId: string; userName: string; isTyping: boolean }) => {
        this.onUserTyping?.(data.threadId, data.userId, data.userName, data.isTyping);
      },
    );

    this.socket.on(
      'user_recording',
      (data: { threadId: string; userId: string; isRecording: boolean; duration?: number }) => {
        this.onUserRecording?.(data.threadId, data.userId, data.isRecording, data.duration);
      },
    );

    this.socket.on(
      'user_selecting_file',
      (data: { threadId: string; userId: string; isSelecting: boolean; fileName?: string }) => {
        this.onUserSelectingFile?.(data.threadId, data.userId, data.isSelecting, data.fileName);
      },
    );

    this.socket.on('unread_count_update', (data: { count: number }) => {
      this.onUnreadCountUpdate?.(data.count);
    });

    this.socket.on(
      'system_inbox_notification',
      (data: {
        notificationId: string;
        title: string;
        message: string;
        type: string;
        priority: string;
        createdAt: string;
      }) => {
        this.onSystemInboxNotification?.(data);
      },
    );

    this.socket.on(
      'inventory_updated',
      (data: {
        productId: string;
        stock: number;
        status: string;
        variants?: Array<{ id: string; sku: string; stock: number }>;
      }) => {
        this.onInventoryUpdated?.(data);
      },
    );

    this.socket.on('joined_thread', (data: { threadId: string }) => {
      console.log('Joined thread:', data.threadId);
    });

    this.socket.on('left_thread', (data: { threadId: string }) => {
      console.log('Left thread:', data.threadId);
    });
  }

  joinThread(threadId: string): void {
    if (!this.socket?.connected) {
      console.warn('WebSocket not connected, cannot join thread');
      return;
    }
    this.socket.emit('join_thread', { threadId });
  }

  leaveThread(threadId: string): void {
    if (!this.socket?.connected) return;
    this.socket.emit('leave_thread', { threadId });
  }

  sendTyping(threadId: string, isTyping: boolean): void {
    if (!this.socket?.connected) return;
    this.socket.emit('typing', { threadId, isTyping });
  }

  sendRecording(threadId: string, isRecording: boolean, duration?: number): void {
    if (!this.socket?.connected) return;
    this.socket.emit('recording', { threadId, isRecording, duration });
  }

  sendFileSelection(threadId: string, isSelecting: boolean, fileName?: string): void {
    if (!this.socket?.connected) return;
    this.socket.emit('selecting_file', { threadId, isSelecting, fileName });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  get connected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onError?: (error: Error) => void;
  onMaxReconnectAttempts?: () => void;
  onNewMessage?: (threadId: string, message: unknown) => void;
  onThreadUpdate?: (threadId: string, update?: unknown, lastMessage?: unknown) => void;
  onUserTyping?: (threadId: string, userId: string, userName: string, isTyping: boolean) => void;
  onUserRecording?: (threadId: string, userId: string, isRecording: boolean, duration?: number) => void;
  onUserSelectingFile?: (
    threadId: string,
    userId: string,
    isSelecting: boolean,
    fileName?: string,
  ) => void;
  onUnreadCountUpdate?: (count: number) => void;
  onSystemInboxNotification?: (data: {
    notificationId: string;
    title: string;
    message: string;
    type: string;
    priority: string;
    createdAt: string;
  }) => void;
  onInventoryUpdated?: (data: {
    productId: string;
    stock: number;
    status: string;
    variants?: Array<{ id: string; sku: string; stock: number }>;
  }) => void;
}

export const websocketService = new WebSocketService();
