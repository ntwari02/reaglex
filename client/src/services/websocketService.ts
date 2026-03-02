/**
 * WebSocket Service for Real-time Inbox Updates
 */

import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import type { Message, MessageThread } from './inboxApi';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:5000';

class WebSocketService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      console.warn('No auth token found, cannot connect to WebSocket');
      return;
    }

    if (this.socket?.connected) {
      console.log('WebSocket already connected');
      return;
    }

    this.socket = io(WS_URL, {
      auth: {
        token: token,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.setupEventHandlers();
  }

  /**
   * Setup WebSocket event handlers
   */
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

    // Inbox-specific events
    this.socket.on('new_message', (data: { threadId: string; message: Message }) => {
      this.onNewMessage?.(data.threadId, data.message);
    });

    this.socket.on('thread_updated', (data: { threadId: string; update?: any; lastMessage?: Message }) => {
      this.onThreadUpdate?.(data.threadId, data.update, data.lastMessage);
    });

    this.socket.on('user_typing', (data: { threadId: string; userId: string; userName: string; isTyping: boolean }) => {
      this.onUserTyping?.(data.threadId, data.userId, data.userName, data.isTyping);
    });

    this.socket.on('user_recording', (data: { threadId: string; userId: string; isRecording: boolean; duration?: number }) => {
      this.onUserRecording?.(data.threadId, data.userId, data.isRecording, data.duration);
    });

    this.socket.on('user_selecting_file', (data: { threadId: string; userId: string; isSelecting: boolean; fileName?: string }) => {
      this.onUserSelectingFile?.(data.threadId, data.userId, data.isSelecting, data.fileName);
    });

    this.socket.on('unread_count_update', (data: { count: number }) => {
      this.onUnreadCountUpdate?.(data.count);
    });

    this.socket.on('joined_thread', (data: { threadId: string }) => {
      console.log('Joined thread:', data.threadId);
    });

    this.socket.on('left_thread', (data: { threadId: string }) => {
      console.log('Left thread:', data.threadId);
    });
  }

  /**
   * Join a thread room to receive updates
   */
  joinThread(threadId: string): void {
    if (!this.socket?.connected) {
      console.warn('WebSocket not connected, cannot join thread');
      return;
    }
    this.socket.emit('join_thread', { threadId });
  }

  /**
   * Leave a thread room
   */
  leaveThread(threadId: string): void {
    if (!this.socket?.connected) return;
    this.socket.emit('leave_thread', { threadId });
  }

  /**
   * Send typing indicator
   */
  sendTyping(threadId: string, isTyping: boolean): void {
    if (!this.socket?.connected) return;
    this.socket.emit('typing', { threadId, isTyping });
  }

  /**
   * Send recording indicator
   */
  sendRecording(threadId: string, isRecording: boolean, duration?: number): void {
    if (!this.socket?.connected) return;
    this.socket.emit('recording', { threadId, isRecording, duration });
  }

  /**
   * Send file selection indicator
   */
  sendFileSelection(threadId: string, isSelecting: boolean, fileName?: string): void {
    if (!this.socket?.connected) return;
    this.socket.emit('selecting_file', { threadId, isSelecting, fileName });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  /**
   * Check if connected
   */
  get connected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  // Event callbacks
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onError?: (error: Error) => void;
  onMaxReconnectAttempts?: () => void;
  onNewMessage?: (threadId: string, message: Message) => void;
  onThreadUpdate?: (threadId: string, update?: any, lastMessage?: Message) => void;
  onUserTyping?: (threadId: string, userId: string, userName: string, isTyping: boolean) => void;
  onUserRecording?: (threadId: string, userId: string, isRecording: boolean, duration?: number) => void;
  onUserSelectingFile?: (threadId: string, userId: string, isSelecting: boolean, fileName?: string) => void;
  onUnreadCountUpdate?: (count: number) => void;
}

// Export singleton instance
export const websocketService = new WebSocketService();

