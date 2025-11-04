/**
 * useWebSocket Hook
 * React hook for managing WebSocket connections and real-time updates
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  WebSocketClient,
  acquireWebSocketClient,
  releaseWebSocketClient,
} from '../websocket/client';
import {
  WebSocketEventType,
  MessagePayload,
  TypingPayload,
  ConversationUpdatePayload,
} from '../websocket/types';

interface UseWebSocketOptions {
  userId: string;
  enabled?: boolean;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  joinConversation: (conversationId: string, userName?: string, userEmail?: string) => void;
  leaveConversation: (conversationId: string) => void;
  sendTypingStart: (conversationId: string, userName: string) => void;
  sendTypingStop: (conversationId: string, userName: string) => void;
  client: WebSocketClient | null;
}

/**
 * Hook for managing WebSocket connection and real-time updates
 * Automatically updates React Query cache when new messages arrive
 */
export function useWebSocket({
  userId,
  enabled = true,
}: UseWebSocketOptions): UseWebSocketReturn {
  const queryClient = useQueryClient();
  const wsClientRef = useRef<WebSocketClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!enabled || !userId) return;

    // Initialize WebSocket client
  const wsClient = acquireWebSocketClient(userId);
    wsClientRef.current = wsClient;

    // Connect to WebSocket server
    wsClient
      .connect()
      .then(() => {
        setIsConnected(true);
      })
      .catch((error) => {
        console.error('Failed to connect to WebSocket:', error);
        setIsConnected(false);
      });

    // Subscribe to connection events
    const unsubscribeConnected = wsClient.on(
      WebSocketEventType.CONNECTED,
      () => {
        setIsConnected(true);
      }
    );

    const unsubscribeDisconnected = wsClient.on(
      WebSocketEventType.DISCONNECTED,
      () => {
        setIsConnected(false);
      }
    );

    // Subscribe to message events
    const unsubscribeMessageReceived = wsClient.on(
      WebSocketEventType.MESSAGE_RECEIVED,
      (payload: MessagePayload) => {
        handleNewMessage(payload);
      }
    );

    const unsubscribeMessageSent = wsClient.on(
      WebSocketEventType.MESSAGE_SENT,
      (payload: MessagePayload) => {
        handleNewMessage(payload);
      }
    );

    const unsubscribeMessageStatusUpdated = wsClient.on(
      WebSocketEventType.MESSAGE_STATUS_UPDATED,
      (payload: MessagePayload) => {
        handleMessageStatusUpdate(payload);
      }
    );

    // Subscribe to conversation events
    const unsubscribeConversationUpdated = wsClient.on(
      WebSocketEventType.CONVERSATION_UPDATED,
      (payload: ConversationUpdatePayload) => {
        handleConversationUpdate(payload);
      }
    );

    // Cleanup on unmount
    return () => {
      unsubscribeConnected();
      unsubscribeDisconnected();
      unsubscribeMessageReceived();
      unsubscribeMessageSent();
      unsubscribeMessageStatusUpdated();
      unsubscribeConversationUpdated();
      if (wsClientRef.current) {
        releaseWebSocketClient(userId);
      }
      wsClientRef.current = null;
    };
  }, [userId, enabled]);

  /**
   * Handle new message received via WebSocket
   * Updates React Query cache to show message immediately
   */
  const handleNewMessage = useCallback(
    (message: MessagePayload) => {
      // Invalidate conversation list to update last message
      queryClient.invalidateQueries({ queryKey: ['conversations'] });

      // Update messages cache for the specific conversation
      queryClient.setQueryData(
        ['messages', message.conversationId],
        (oldData: any) => {
          if (!oldData) return oldData;

          // Check if message already exists (avoid duplicates)
          const messageExists = oldData.pages?.some((page: any) =>
            page.messages?.some((m: any) => m.id === message.id)
          );

          if (messageExists) return oldData;

          // Add new message to the first page
          return {
            ...oldData,
            pages: oldData.pages?.map((page: any, index: number) => {
              if (index === 0) {
                return {
                  ...page,
                  messages: [message, ...(page.messages || [])],
                };
              }
              return page;
            }),
          };
        }
      );

      // Invalidate conversation details
      queryClient.invalidateQueries({
        queryKey: ['conversation', message.conversationId],
      });
    },
    [queryClient]
  );

  /**
   * Handle message status update
   */
  const handleMessageStatusUpdate = useCallback(
    (message: MessagePayload) => {
      // Update message status in cache
      queryClient.setQueryData(
        ['messages', message.conversationId],
        (oldData: any) => {
          if (!oldData) return oldData;

          return {
            ...oldData,
            pages: oldData.pages?.map((page: any) => ({
              ...page,
              messages: page.messages?.map((m: any) =>
                m.id === message.id ? { ...m, status: message.status } : m
              ),
            })),
          };
        }
      );
    },
    [queryClient]
  );

  /**
   * Handle conversation update
   */
  const handleConversationUpdate = useCallback(
    (conversation: ConversationUpdatePayload) => {
      // Invalidate conversation list
      queryClient.invalidateQueries({ queryKey: ['conversations'] });

      // Update specific conversation in cache
      queryClient.setQueryData(['conversation', conversation.id], (oldData: any) => {
        if (!oldData) return oldData;
        return { ...oldData, ...conversation };
      });
    },
    [queryClient]
  );

  /**
   * Join a conversation room
   */
  const joinConversation = useCallback((conversationId: string, userName?: string, userEmail?: string) => {
    wsClientRef.current?.joinConversation(conversationId, userName || 'Unknown', userEmail);
  }, []);

  /**
   * Leave a conversation room
   */
  const leaveConversation = useCallback((conversationId: string) => {
    wsClientRef.current?.leaveConversation(conversationId);
  }, []);

  /**
   * Send typing start indicator
   */
  const sendTypingStart = useCallback(
    (conversationId: string, userName: string) => {
      wsClientRef.current?.sendTypingStart(conversationId, userName);
    },
    []
  );

  /**
   * Send typing stop indicator
   */
  const sendTypingStop = useCallback(
    (conversationId: string, userName: string) => {
      wsClientRef.current?.sendTypingStop(conversationId, userName);
    },
    []
  );

  return {
    isConnected,
    joinConversation,
    leaveConversation,
    sendTypingStart,
    sendTypingStop,
    client: wsClientRef.current,
  };
}
