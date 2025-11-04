/**
 * usePresence Hook
 * Manages user presence tracking in conversations
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { WebSocketClient } from '../websocket/client';
import { WebSocketEventType, PresencePayload, PresenceStatePayload } from '../websocket/types';

export interface PresenceUser {
  userId: string;
  userName: string;
  userEmail?: string;
  status: 'viewing' | 'editing';
  lastSeen: string;
}

interface UsePresenceOptions {
  conversationId: string;
  userId: string;
  userName: string;
  userEmail?: string;
  wsClient?: WebSocketClient | null;
}

/**
 * Hook for managing user presence in a conversation
 */
export function usePresence({
  conversationId,
  userId,
  userName,
  userEmail,
  wsClient,
}: UsePresenceOptions) {
  const [activeUsers, setActiveUsers] = useState<PresenceUser[]>([]);
  const [currentStatus, setCurrentStatus] = useState<'viewing' | 'editing'>('viewing');

  // Subscribe to presence events
  useEffect(() => {
    if (!wsClient) return;

    // Handle presence state (initial state when joining)
    const unsubscribeState = wsClient.on(
      WebSocketEventType.PRESENCE_STATE,
      (payload: PresenceStatePayload) => {
        if (payload.conversationId === conversationId) {
          setActiveUsers(
            payload.users
              .filter((user) => user.userId !== userId)
              .map((user) => ({
                userId: user.userId,
                userName: user.userName,
                userEmail: user.userEmail,
                status: user.status,
                lastSeen: user.lastSeen,
              }))
          );
        }
      }
    );

    // Handle user joined
    const unsubscribeJoined = wsClient.on(
      WebSocketEventType.USER_JOINED,
      (payload: PresencePayload) => {
        if (payload.conversationId === conversationId && payload.userId !== userId) {
          setActiveUsers((prev) => {
            // Check if user already exists
            const exists = prev.some((u) => u.userId === payload.userId);
            if (exists) return prev;

            return [
              ...prev,
              {
                userId: payload.userId,
                userName: payload.userName || 'Unknown',
                userEmail: payload.userEmail,
                status: payload.status || 'viewing',
                lastSeen: new Date().toISOString(),
              },
            ];
          });
        }
      }
    );

    // Handle user left
    const unsubscribeLeft = wsClient.on(
      WebSocketEventType.USER_LEFT,
      (payload: PresencePayload) => {
        if (payload.conversationId === conversationId) {
          setActiveUsers((prev) => prev.filter((u) => u.userId !== payload.userId));
        }
      }
    );

    // Handle presence update
    const unsubscribeUpdate = wsClient.on(
      WebSocketEventType.PRESENCE_UPDATE,
      (payload: PresencePayload) => {
        if (payload.conversationId === conversationId && payload.userId !== userId) {
          setActiveUsers((prev) =>
            prev.map((user) =>
              user.userId === payload.userId
                ? {
                    ...user,
                    status: payload.status || user.status,
                    lastSeen: new Date().toISOString(),
                  }
                : user
            )
          );
        }
      }
    );

    return () => {
      unsubscribeState();
      unsubscribeJoined();
      unsubscribeLeft();
      unsubscribeUpdate();
    };
  }, [wsClient, conversationId, userId]);

  /**
   * Update current user's presence status
   */
  const updateStatus = useCallback(
    (status: 'viewing' | 'editing') => {
      if (!wsClient || currentStatus === status) return;

      setCurrentStatus(status);
      wsClient.updatePresence(conversationId, status, userName, userEmail);
    },
    [wsClient, conversationId, userName, userEmail, currentStatus]
  );

  /**
   * Get users by status
   */
  const getUsersByStatus = useCallback(
    (status: 'viewing' | 'editing') => {
      return activeUsers.filter((user) => user.status === status);
    },
    [activeUsers]
  );

  /**
   * Get formatted presence text
   */
  const getPresenceText = useCallback((): string | null => {
    if (activeUsers.length === 0) return null;

    const editingUsers = getUsersByStatus('editing');
    const viewingUsers = getUsersByStatus('viewing');

    const parts: string[] = [];

    if (editingUsers.length > 0) {
      if (editingUsers.length === 1) {
        parts.push(`${editingUsers[0].userName} is editing`);
      } else if (editingUsers.length === 2) {
        parts.push(`${editingUsers[0].userName} and ${editingUsers[1].userName} are editing`);
      } else {
        parts.push(`${editingUsers[0].userName} and ${editingUsers.length - 1} others are editing`);
      }
    }

    if (viewingUsers.length > 0 && editingUsers.length === 0) {
      if (viewingUsers.length === 1) {
        parts.push(`${viewingUsers[0].userName} is viewing`);
      } else if (viewingUsers.length === 2) {
        parts.push(`${viewingUsers[0].userName} and ${viewingUsers[1].userName} are viewing`);
      } else {
        parts.push(`${viewingUsers[0].userName} and ${viewingUsers.length - 1} others are viewing`);
      }
    }

    return parts.join(', ');
  }, [activeUsers, getUsersByStatus]);

  return {
    activeUsers,
    editingUsers: getUsersByStatus('editing'),
    viewingUsers: getUsersByStatus('viewing'),
    currentStatus,
    updateStatus,
    presenceText: getPresenceText(),
    hasActiveUsers: activeUsers.length > 0,
  };
}
