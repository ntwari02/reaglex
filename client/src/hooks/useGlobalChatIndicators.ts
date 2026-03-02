/**
 * Global Chat Indicators Hook
 * 
 * Manages typing and recording indicators for ALL chats (both open and in chat list).
 * This ensures indicators appear simultaneously in:
 * - Open chat view (above input area)
 * - Chat list view (under user name)
 * 
 * Key features:
 * - Event-based updates via Socket.IO
 * - Automatic cleanup when typing/recording stops
 * - Priority: recording > typing
 * - Thread-safe state management
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { websocketService } from '@/services/websocketService';

export interface ChatIndicator {
  threadId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
  isRecording: boolean;
  recordingDuration?: number;
  timestamp: number; // For auto-cleanup
}

interface UseGlobalChatIndicatorsOptions {
  currentUserId?: string;
  getUserName?: (threadId: string, userId: string) => string | null;
}

const TYPING_TIMEOUT = 3000; // 3 seconds - auto-remove typing indicator if no update
const RECORDING_TIMEOUT = 10000; // 10 seconds - auto-remove recording indicator if no update

export const useGlobalChatIndicators = (options: UseGlobalChatIndicatorsOptions = {}) => {
  const { currentUserId, getUserName } = options;
  
  // Map of threadId -> Map of userId -> indicator
  const [indicators, setIndicators] = useState<Map<string, Map<string, ChatIndicator>>>(new Map());
  const cleanupTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  /**
   * Get indicator for a specific thread and user
   */
  const getThreadIndicator = useCallback((threadId: string, userId: string): ChatIndicator | null => {
    const threadIndicators = indicators.get(threadId);
    if (!threadIndicators) return null;
    return threadIndicators.get(userId) || null;
  }, [indicators]);

  /**
   * Get all indicators for a specific thread
   */
  const getThreadIndicators = useCallback((threadId: string): ChatIndicator[] => {
    const threadIndicators = indicators.get(threadId);
    if (!threadIndicators) return [];
    return Array.from(threadIndicators.values());
  }, [indicators]);

  /**
   * Check if a thread has any active indicators
   */
  const hasActiveIndicators = useCallback((threadId: string): boolean => {
    const threadIndicators = indicators.get(threadId);
    if (!threadIndicators) return false;
    return Array.from(threadIndicators.values()).some(
      ind => ind.isTyping || ind.isRecording
    );
  }, [indicators]);

  /**
   * Update indicator for a thread and user
   */
  const updateIndicator = useCallback((
    threadId: string,
    userId: string,
    updates: Partial<Omit<ChatIndicator, 'threadId' | 'userId' | 'timestamp'>>
  ) => {
    setIndicators((prev) => {
      const newMap = new Map(prev);
      const threadIndicators = newMap.get(threadId) || new Map<string, ChatIndicator>();
      
      const existing = threadIndicators.get(userId);
      const indicator: ChatIndicator = {
        threadId,
        userId,
        userName: updates.userName || existing?.userName || getUserName?.(threadId, userId) || 'Someone',
        isTyping: updates.isTyping ?? existing?.isTyping ?? false,
        isRecording: updates.isRecording ?? existing?.isRecording ?? false,
        recordingDuration: updates.recordingDuration ?? existing?.recordingDuration,
        timestamp: Date.now(),
      };

      // Priority: recording overrides typing
      if (indicator.isRecording) {
        indicator.isTyping = false;
      }

      threadIndicators.set(userId, indicator);
      newMap.set(threadId, threadIndicators);

      // Set cleanup timeout
      const timeoutKey = `${threadId}-${userId}`;
      const existingTimeout = cleanupTimeoutsRef.current.get(timeoutKey);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      if (indicator.isTyping) {
        const timeout = setTimeout(() => {
          setIndicators((current) => {
            const currentMap = new Map(current);
            const currentThreadIndicators = currentMap.get(threadId);
            if (currentThreadIndicators) {
              const currentIndicator = currentThreadIndicators.get(userId);
              // Only remove if it's still typing and hasn't been updated
              if (currentIndicator?.isTyping && (Date.now() - currentIndicator.timestamp) > TYPING_TIMEOUT) {
                const updatedThreadIndicators = new Map(currentThreadIndicators);
                updatedThreadIndicators.delete(userId);
                if (updatedThreadIndicators.size === 0) {
                  currentMap.delete(threadId);
                } else {
                  currentMap.set(threadId, updatedThreadIndicators);
                }
              }
            }
            cleanupTimeoutsRef.current.delete(timeoutKey);
            return currentMap;
          });
        }, TYPING_TIMEOUT);
        cleanupTimeoutsRef.current.set(timeoutKey, timeout);
      } else if (indicator.isRecording) {
        const timeout = setTimeout(() => {
          setIndicators((current) => {
            const currentMap = new Map(current);
            const currentThreadIndicators = currentMap.get(threadId);
            if (currentThreadIndicators) {
              const currentIndicator = currentThreadIndicators.get(userId);
              // Only remove if it's still recording and hasn't been updated
              if (currentIndicator?.isRecording && (Date.now() - currentIndicator.timestamp) > RECORDING_TIMEOUT) {
                const updatedThreadIndicators = new Map(currentThreadIndicators);
                updatedThreadIndicators.delete(userId);
                if (updatedThreadIndicators.size === 0) {
                  currentMap.delete(threadId);
                } else {
                  currentMap.set(threadId, updatedThreadIndicators);
                }
              }
            }
            cleanupTimeoutsRef.current.delete(timeoutKey);
            return currentMap;
          });
        }, RECORDING_TIMEOUT);
        cleanupTimeoutsRef.current.set(timeoutKey, timeout);
      } else {
        // Remove indicator if both are false
        threadIndicators.delete(userId);
        if (threadIndicators.size === 0) {
          newMap.delete(threadId);
        }
        cleanupTimeoutsRef.current.delete(timeoutKey);
      }

      return newMap;
    });
  }, [getUserName]);

  /**
   * Remove indicator for a thread and user
   */
  const removeIndicator = useCallback((threadId: string, userId: string) => {
    setIndicators((prev) => {
      const newMap = new Map(prev);
      const threadIndicators = newMap.get(threadId);
      if (threadIndicators) {
        threadIndicators.delete(userId);
        if (threadIndicators.size === 0) {
          newMap.delete(threadId);
        }
      }
      return newMap;
    });

    // Clear timeout
    const timeoutKey = `${threadId}-${userId}`;
    const existingTimeout = cleanupTimeoutsRef.current.get(timeoutKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      cleanupTimeoutsRef.current.delete(timeoutKey);
    }
  }, []);

  /**
   * Clear all indicators for a thread
   */
  const clearThreadIndicators = useCallback((threadId: string) => {
    setIndicators((prev) => {
      const newMap = new Map(prev);
      const threadIndicators = newMap.get(threadId);
      if (threadIndicators) {
        // Clear all timeouts for this thread
        threadIndicators.forEach((_, userId) => {
          const timeoutKey = `${threadId}-${userId}`;
          const existingTimeout = cleanupTimeoutsRef.current.get(timeoutKey);
          if (existingTimeout) {
            clearTimeout(existingTimeout);
            cleanupTimeoutsRef.current.delete(timeoutKey);
          }
        });
      }
      newMap.delete(threadId);
      return newMap;
    });
  }, []);

  // Setup WebSocket listeners
  useEffect(() => {
    // Handle typing events
    const originalOnUserTyping = websocketService.onUserTyping;
    websocketService.onUserTyping = (threadId: string, userId: string, userName: string, isTyping: boolean) => {
      // Call original handler if it exists (for open chat indicators)
      if (originalOnUserTyping) {
        originalOnUserTyping(threadId, userId, userName, isTyping);
      }

      // Don't show indicator for current user
      if (userId === currentUserId) return;

      if (isTyping) {
        updateIndicator(threadId, userId, {
          isTyping: true,
          isRecording: false, // Typing stops recording indicator
          userName,
        });
      } else {
        updateIndicator(threadId, userId, {
          isTyping: false,
        });
      }
    };

    // Handle recording events
    const originalOnUserRecording = websocketService.onUserRecording;
    websocketService.onUserRecording = (threadId: string, userId: string, isRecording: boolean, duration?: number) => {
      // Call original handler if it exists (for open chat indicators)
      if (originalOnUserRecording) {
        originalOnUserRecording(threadId, userId, isRecording, duration);
      }

      // Don't show indicator for current user
      if (userId === currentUserId) return;

      if (isRecording) {
        updateIndicator(threadId, userId, {
          isRecording: true,
          isTyping: false, // Recording overrides typing
          recordingDuration: duration,
          userName: getUserName?.(threadId, userId) || undefined,
        });
      } else {
        updateIndicator(threadId, userId, {
          isRecording: false,
          recordingDuration: undefined,
        });
      }
    };

    // Cleanup
    return () => {
      // Restore original handlers
      websocketService.onUserTyping = originalOnUserTyping;
      websocketService.onUserRecording = originalOnUserRecording;
      
      // Clear all timeouts
      cleanupTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      cleanupTimeoutsRef.current.clear();
    };
  }, [currentUserId, getUserName, updateIndicator]);

  return {
    indicators,
    getThreadIndicator,
    getThreadIndicators,
    hasActiveIndicators,
    updateIndicator,
    removeIndicator,
    clearThreadIndicators,
  };
};

