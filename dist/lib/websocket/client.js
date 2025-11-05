"use strict";
/**
 * WebSocket Client Utilities
 * Helper functions for client-side WebSocket operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketClient = void 0;
exports.acquireWebSocketClient = acquireWebSocketClient;
exports.releaseWebSocketClient = releaseWebSocketClient;
const types_1 = require("./types");
class WebSocketClient {
    ws = null;
    reconnectAttempts = 0;
    maxReconnectAttempts = 5;
    reconnectDelay = 1000;
    listeners = new Map();
    userId;
    isIntentionallyClosed = false;
    connectPromise = null;
    pendingMessages = [];
    refCount = 0;
    constructor(userId) {
        this.userId = userId;
    }
    /**
     * Connect to WebSocket server
     */
    connect() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            return Promise.resolve();
        }
        if (this.connectPromise) {
            return this.connectPromise;
        }
        return new Promise((resolve, reject) => {
            try {
                const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                const wsUrl = `${protocol}//${window.location.host}/api/ws?userId=${this.userId}`;
                this.ws = new WebSocket(wsUrl);
                this.isIntentionallyClosed = false;
                this.connectPromise = new Promise((innerResolve, innerReject) => {
                    this.ws.onopen = () => {
                        console.log('✅ WebSocket connected');
                        this.reconnectAttempts = 0;
                        this.flushPendingMessages();
                        this.connectPromise = null;
                        this.emitEvent(types_1.WebSocketEventType.CONNECTED, { userId: this.userId });
                        innerResolve();
                        resolve();
                    };
                    this.ws.onmessage = (event) => {
                        try {
                            const message = JSON.parse(event.data);
                            this.handleMessage(message);
                        }
                        catch (error) {
                            console.error('Failed to parse WebSocket message:', error);
                        }
                    };
                    this.ws.onclose = (event) => {
                        console.log('❌ WebSocket disconnected', event.code, event.reason);
                        this.ws = null;
                        this.connectPromise = null;
                        this.emitEvent(types_1.WebSocketEventType.DISCONNECTED, {
                            code: event.code,
                            reason: event.reason,
                        });
                        // Attempt reconnection if not intentionally closed
                        if (!this.isIntentionallyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
                            this.attemptReconnect();
                        }
                    };
                    this.ws.onerror = (error) => {
                        console.error('WebSocket error:', error);
                        this.connectPromise = null;
                        this.ws = null;
                        innerReject(error);
                        reject(error);
                    };
                });
                this.connectPromise.catch(() => {
                    // Already handled in onerror; just ensure resolve/reject settled
                });
            }
            catch (error) {
                reject(error);
            }
        });
    }
    /**
     * Attempt to reconnect with exponential backoff
     */
    attemptReconnect() {
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms...`);
        setTimeout(() => {
            this.connect()
                .then(() => {
                this.emitEvent(types_1.WebSocketEventType.CONNECTED, { userId: this.userId });
            })
                .catch((error) => {
                console.error('Reconnection failed:', error);
            });
        }, delay);
    }
    /**
     * Disconnect from WebSocket server
     */
    disconnect() {
        this.refCount = 0;
        this.dispose();
    }
    /**
     * Send a message through WebSocket
     */
    send(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
        else {
            this.queueMessage(message);
        }
    }
    /**
     * Handle incoming messages
     */
    handleMessage(message) {
        const listeners = this.listeners.get(message.type);
        if (listeners) {
            listeners.forEach((callback) => callback(message.payload));
        }
    }
    queueMessage(message) {
        this.pendingMessages.push(message);
        if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
            this.connect().catch((error) => {
                console.error('Failed to connect while queueing message:', error);
            });
        }
    }
    flushPendingMessages() {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            return;
        }
        while (this.pendingMessages.length > 0) {
            const message = this.pendingMessages.shift();
            if (message) {
                try {
                    this.ws.send(JSON.stringify(message));
                }
                catch (error) {
                    console.error('Failed to send queued WebSocket message:', error);
                    break;
                }
            }
        }
    }
    emitEvent(eventType, payload) {
        const listeners = this.listeners.get(eventType);
        if (listeners) {
            listeners.forEach((callback) => callback(payload));
        }
    }
    retain() {
        this.refCount += 1;
    }
    release() {
        this.refCount = Math.max(0, this.refCount - 1);
        if (this.refCount === 0) {
            this.dispose();
            return true;
        }
        return false;
    }
    dispose() {
        this.isIntentionallyClosed = true;
        this.pendingMessages = [];
        this.connectPromise = null;
        this.refCount = 0;
        if (this.ws) {
            try {
                this.ws.close();
            }
            catch (error) {
                console.error('Failed to close WebSocket cleanly:', error);
            }
            this.ws = null;
        }
        this.listeners.clear();
    }
    /**
     * Subscribe to WebSocket events
     */
    on(eventType, callback) {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, new Set());
        }
        this.listeners.get(eventType).add(callback);
        // Return unsubscribe function
        return () => {
            const listeners = this.listeners.get(eventType);
            if (listeners) {
                listeners.delete(callback);
            }
        };
    }
    /**
     * Join a conversation room
     */
    joinConversation(conversationId, userName, userEmail) {
        this.send({
            type: types_1.WebSocketEventType.USER_JOINED,
            payload: { userId: this.userId, conversationId, userName, userEmail },
            timestamp: new Date().toISOString(),
            conversationId,
        });
    }
    /**
     * Leave a conversation room
     */
    leaveConversation(conversationId) {
        this.send({
            type: types_1.WebSocketEventType.USER_LEFT,
            payload: { userId: this.userId, conversationId },
            timestamp: new Date().toISOString(),
            conversationId,
        });
    }
    /**
     * Update presence status
     */
    updatePresence(conversationId, status, userName, userEmail) {
        this.send({
            type: types_1.WebSocketEventType.PRESENCE_UPDATE,
            payload: { userId: this.userId, conversationId, status, userName, userEmail },
            timestamp: new Date().toISOString(),
            conversationId,
        });
    }
    /**
     * Send typing indicator
     */
    sendTypingStart(conversationId, userName) {
        this.send({
            type: types_1.WebSocketEventType.TYPING_START,
            payload: { userId: this.userId, userName, conversationId },
            timestamp: new Date().toISOString(),
            conversationId,
        });
    }
    /**
     * Stop typing indicator
     */
    sendTypingStop(conversationId, userName) {
        this.send({
            type: types_1.WebSocketEventType.TYPING_STOP,
            payload: { userId: this.userId, userName, conversationId },
            timestamp: new Date().toISOString(),
            conversationId,
        });
    }
    /**
     * Check if WebSocket is connected
     */
    isConnected() {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }
}
exports.WebSocketClient = WebSocketClient;
const clientRegistry = new Map();
function acquireWebSocketClient(userId) {
    let client = clientRegistry.get(userId);
    if (!client) {
        client = new WebSocketClient(userId);
        clientRegistry.set(userId, client);
    }
    client.retain();
    return client;
}
function releaseWebSocketClient(userId) {
    const client = clientRegistry.get(userId);
    if (!client)
        return;
    const shouldDispose = client.release();
    if (shouldDispose) {
        clientRegistry.delete(userId);
    }
}
