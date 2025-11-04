/**
 * WebSocket Broadcasting Utilities
 * Helper functions to broadcast events from API routes
 */

import { wsManager } from './server';
import {
  WebSocketEventType,
  MessagePayload,
  ConversationUpdatePayload,
} from './types';

/**
 * Broadcast new message to conversation participants
 */
export function broadcastNewMessage(message: MessagePayload) {
  wsManager.broadcastToConversation(message.conversationId, {
    type: WebSocketEventType.MESSAGE_RECEIVED,
    payload: message,
    timestamp: new Date().toISOString(),
    conversationId: message.conversationId,
  });
}

/**
 * Broadcast message sent confirmation
 */
export function broadcastMessageSent(message: MessagePayload) {
  wsManager.broadcastToConversation(message.conversationId, {
    type: WebSocketEventType.MESSAGE_SENT,
    payload: message,
    timestamp: new Date().toISOString(),
    conversationId: message.conversationId,
  });
}

/**
 * Broadcast message status update
 */
export function broadcastMessageStatusUpdate(message: MessagePayload) {
  wsManager.broadcastToConversation(message.conversationId, {
    type: WebSocketEventType.MESSAGE_STATUS_UPDATED,
    payload: message,
    timestamp: new Date().toISOString(),
    conversationId: message.conversationId,
  });
}

/**
 * Broadcast conversation update
 */
export function broadcastConversationUpdate(conversation: ConversationUpdatePayload) {
  wsManager.broadcastToConversation(conversation.id, {
    type: WebSocketEventType.CONVERSATION_UPDATED,
    payload: conversation,
    timestamp: new Date().toISOString(),
    conversationId: conversation.id,
  });
}

/**
 * Broadcast to specific user
 */
export function broadcastToUser(userId: string, type: WebSocketEventType, payload: any) {
  wsManager.broadcastToUser(userId, {
    type,
    payload,
    timestamp: new Date().toISOString(),
    userId,
  });
}

/**
 * Get active users in a conversation
 */
export function getConversationActiveUsers(conversationId: string) {
  const clients = wsManager.getConversationClients(conversationId);
  return clients.map((client) => ({
    userId: client.userId,
    clientId: client.id,
  }));
}

/**
 * Get total connected clients count
 */
export function getConnectedClientsCount(): number {
  return wsManager.getClientsCount();
}
