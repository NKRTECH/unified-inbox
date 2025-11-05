"use strict";
/**
 * WebSocket Broadcasting Utilities
 * Helper functions to broadcast events from API routes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.broadcastNewMessage = broadcastNewMessage;
exports.broadcastMessageSent = broadcastMessageSent;
exports.broadcastMessageStatusUpdate = broadcastMessageStatusUpdate;
exports.broadcastConversationUpdate = broadcastConversationUpdate;
exports.broadcastToUser = broadcastToUser;
exports.getConversationActiveUsers = getConversationActiveUsers;
exports.getConnectedClientsCount = getConnectedClientsCount;
const server_1 = require("./server");
const types_1 = require("./types");
/**
 * Broadcast new message to conversation participants
 */
function broadcastNewMessage(message) {
    server_1.wsManager.broadcastToConversation(message.conversationId, {
        type: types_1.WebSocketEventType.MESSAGE_RECEIVED,
        payload: message,
        timestamp: new Date().toISOString(),
        conversationId: message.conversationId,
    });
}
/**
 * Broadcast message sent confirmation
 */
function broadcastMessageSent(message) {
    server_1.wsManager.broadcastToConversation(message.conversationId, {
        type: types_1.WebSocketEventType.MESSAGE_SENT,
        payload: message,
        timestamp: new Date().toISOString(),
        conversationId: message.conversationId,
    });
}
/**
 * Broadcast message status update
 */
function broadcastMessageStatusUpdate(message) {
    server_1.wsManager.broadcastToConversation(message.conversationId, {
        type: types_1.WebSocketEventType.MESSAGE_STATUS_UPDATED,
        payload: message,
        timestamp: new Date().toISOString(),
        conversationId: message.conversationId,
    });
}
/**
 * Broadcast conversation update
 */
function broadcastConversationUpdate(conversation) {
    server_1.wsManager.broadcastToConversation(conversation.id, {
        type: types_1.WebSocketEventType.CONVERSATION_UPDATED,
        payload: conversation,
        timestamp: new Date().toISOString(),
        conversationId: conversation.id,
    });
}
/**
 * Broadcast to specific user
 */
function broadcastToUser(userId, type, payload) {
    server_1.wsManager.broadcastToUser(userId, {
        type,
        payload,
        timestamp: new Date().toISOString(),
        userId,
    });
}
/**
 * Get active users in a conversation
 */
function getConversationActiveUsers(conversationId) {
    const clients = server_1.wsManager.getConversationClients(conversationId);
    return clients.map((client) => ({
        userId: client.userId,
        clientId: client.id,
    }));
}
/**
 * Get total connected clients count
 */
function getConnectedClientsCount() {
    return server_1.wsManager.getClientsCount();
}
