/**
 * useTypingIndicator Hook
 * Manages typing indicators for conversations
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { WebSocketClient } from '../websocket/client';
import { WebSocketEventType, TypingPayload } from '../websocket/types';

interface UseTypingIndicatorOptions {
  conversationId: string;
  userId: string;
  userName: string;
  wsClient?: WebSocketClient | null;
}

interface TypingUser {
  userId: string;
  userName: string;
  timestamp: number;
}

const TYPING_TIMEOUT = 3000; // 3 seconds

/**
 * Hook for managing typing indicators in a conversation
 */
export function useTypingIndicator({
  conversationId,
  userId,
  userName,
  wsClient,
}: UseTypingIndicatorOptions) {
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingUser>>(new Map());
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cleanupIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Subscribe to typing events
  useEffect(() => {
    if (!wsClient) return;

    const unsubscribeTypingStart = wsClient.on(
      WebSocketEventType.TYPING_START,
      (payload: TypingPayload) => {
        if (payload.conversationId === conversationId && payload.userId !== userId) {
          setTypingUsers((prev) => {
            const next = new Map(prev);
            next.set(payload.userId, {
              userId: payload.userId,
              userName: payload.userName,
              timestamp: Date.now(),
            });
            return next;
          });
        }
      }
    );

    const unsubscribeTypingStop = wsClient.on(
      WebSocketEventType.TYPING_STOP,
      (payload: TypingPayload) => {
        if (payload.conversationId === conversationId) {
          setTypingUsers((prev) => {
            const next = new Map(prev);
            next.delete(payload.userId);
            return next;
          });
        }
      }
    );

    // Cleanup stale typing indicators
    cleanupIntervalRef.current = setInterval(() => {
      const now = Date.now();
      setTypingUsers((prev) => {
        const next = new Map(prev);
        let hasChanges = false;

        next.forEach((user, id) => {
          if (now - user.timestamp > TYPING_TIMEOUT) {
            next.delete(id);
            hasChanges = true;
          }
        });

        return hasChanges ? next : prev;
      });
    }, 1000);

    return () => {
      unsubscribeTypingStart();
      unsubscribeTypingStop();
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
      }
    };
  }, [wsClient, conversationId, userId]);

  /**
   * Notify that user started typing
   */
  const startTyping = useCallback(() => {
    if (!wsClient) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Send typing start event
    wsClient.sendTypingStart(conversationId, userName);

    // Auto-stop typing after timeout
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, TYPING_TIMEOUT);
  }, [wsClient, conversationId, userName]);

  /**
   * Notify that user stopped typing
   */
  const stopTyping = useCallback(() => {
    if (!wsClient) return;

    // Clear timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    // Send typing stop event
    wsClient.sendTypingStop(conversationId, userName);
  }, [wsClient, conversationId, userName]);

  /**
   * Get formatted typing indicator text
   */
  const getTypingText = useCallback((): string | null => {
    const users = Array.from(typingUsers.values());
    
    if (users.length === 0) return null;
    if (users.length === 1) return `${users[0].userName} is typing...`;
    if (users.length === 2) return `${users[0].userName} and ${users[1].userName} are typing...`;
    return `${users[0].userName} and ${users.length - 1} others are typing...`;
  }, [typingUsers]);

  return {
    typingUsers: Array.from(typingUsers.values()),
    isAnyoneTyping: typingUsers.size > 0,
    typingText: getTypingText(),
    startTyping,
    stopTyping,
  };
}
