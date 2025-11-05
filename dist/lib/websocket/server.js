"use strict";
/**
 * WebSocket Server Implementation
 * Manages real-time connections and message broadcasting
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.wsManager = void 0;
const ws_1 = require("ws");
const url_1 = require("url");
const types_1 = require("./types");
const presence_service_1 = require("../services/presence-service");
class WebSocketManager {
    wss = null;
    clients = new Map();
    upgradeListeners = [];
    /**
     * Initialize WebSocket server
     */
    initialize(server, existingUpgradeListeners = []) {
        this.wss = new ws_1.WebSocketServer({ noServer: true });
        this.upgradeListeners = [...existingUpgradeListeners];
        this.wss.on('connection', (ws, request) => {
            this.handleConnection(ws, request);
        });
        const handleUpgrade = (request, socket, head) => {
            const { pathname } = (0, url_1.parse)(request.url || '');
            if (pathname === '/api/ws') {
                this.wss?.handleUpgrade(request, socket, head, (ws) => {
                    this.wss?.emit('connection', ws, request);
                });
                return;
            }
            // Let captured listeners (e.g., Next.js HMR) handle other paths
            this.upgradeListeners.forEach((listener) => {
                listener.call(server, request, socket, head);
            });
        };
        // Capture future upgrade listeners (e.g., added by Next.js after init)
        const captureUpgradeListener = (event, listener) => {
            if (event !== 'upgrade')
                return;
            if (listener === handleUpgrade)
                return;
            const upgradeListener = listener;
            if (!this.upgradeListeners.includes(upgradeListener)) {
                this.upgradeListeners.push(upgradeListener);
            }
            // Remove the listener from the server so it's only invoked manually
            setImmediate(() => {
                server.removeListener('upgrade', upgradeListener);
            });
        };
        server.on('newListener', captureUpgradeListener);
        server.on('upgrade', handleUpgrade);
        console.log('✅ WebSocket server initialized');
    }
    /**
     * Handle new WebSocket connection
     */
    handleConnection(ws, request) {
        const { query } = (0, url_1.parse)(request.url || '', true);
        const userId = query.userId;
        const clientId = `${userId}-${Date.now()}`;
        if (!userId) {
            console.error('❌ Connection rejected: No userId provided');
            ws.close(1008, 'User ID required');
            return;
        }
        const client = {
            id: clientId,
            userId,
            conversationIds: new Set(),
            send: (message) => {
                if (ws.readyState === ws_1.WebSocket.OPEN) {
                    try {
                        ws.send(JSON.stringify(message));
                    }
                    catch (error) {
                        console.error(`Failed to send message to client ${clientId}:`, error);
                    }
                }
            },
        };
        this.clients.set(clientId, client);
        console.log(`✅ Client connected: ${clientId} (User: ${userId})`);
        // Send connection confirmation
        try {
            client.send({
                type: types_1.WebSocketEventType.CONNECTED,
                payload: { clientId, userId },
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error(`Failed to send connection confirmation to ${clientId}:`, error);
        }
        // Set up ping/pong to keep connection alive
        let isAlive = true;
        ws.on('pong', () => {
            isAlive = true;
        });
        const pingInterval = setInterval(() => {
            if (!isAlive) {
                clearInterval(pingInterval);
                ws.terminate();
                return;
            }
            isAlive = false;
            ws.ping();
        }, 30000); // Ping every 30 seconds
        // Handle incoming messages
        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                this.handleMessage(clientId, message);
            }
            catch (error) {
                console.error('Failed to parse WebSocket message:', error);
            }
        });
        // Handle disconnection
        ws.on('close', (code, reason) => {
            clearInterval(pingInterval);
            console.log(`❌ Client disconnected: ${clientId} (code: ${code}, reason: ${reason.toString() || 'none'})`);
            this.handleDisconnection(clientId);
        });
        // Handle errors
        ws.on('error', (error) => {
            console.error(`❌ WebSocket error for client ${clientId}:`, error);
            clearInterval(pingInterval);
        });
    }
    /**
     * Handle incoming WebSocket messages
     */
    handleMessage(clientId, message) {
        const client = this.clients.get(clientId);
        if (!client)
            return;
        switch (message.type) {
            case types_1.WebSocketEventType.USER_JOINED:
                if (message.conversationId) {
                    client.conversationIds.add(message.conversationId);
                    // Update presence
                    const payload = message.payload;
                    presence_service_1.presenceService.updatePresence(message.conversationId, client.userId, payload.userName || 'Unknown', 'viewing', payload.userEmail);
                    // Send current presence state to the joining user
                    this.sendPresenceState(clientId, message.conversationId);
                    // Broadcast join to others
                    this.broadcastToConversation(message.conversationId, message, clientId);
                }
                break;
            case types_1.WebSocketEventType.USER_LEFT:
                if (message.conversationId) {
                    client.conversationIds.delete(message.conversationId);
                    // Remove presence
                    presence_service_1.presenceService.removePresence(message.conversationId, client.userId);
                    this.broadcastToConversation(message.conversationId, message, clientId);
                }
                break;
            case types_1.WebSocketEventType.PRESENCE_UPDATE:
                if (message.conversationId) {
                    const payload = message.payload;
                    // Update presence status
                    presence_service_1.presenceService.updatePresence(message.conversationId, client.userId, payload.userName || 'Unknown', payload.status || 'viewing', payload.userEmail);
                    // Broadcast presence update
                    this.broadcastToConversation(message.conversationId, message, clientId);
                }
                break;
            case types_1.WebSocketEventType.TYPING_START:
            case types_1.WebSocketEventType.TYPING_STOP:
                if (message.conversationId) {
                    this.broadcastToConversation(message.conversationId, message, clientId);
                }
                break;
            default:
                console.log(`Unhandled message type: ${message.type}`);
        }
    }
    /**
     * Send current presence state to a client
     */
    sendPresenceState(clientId, conversationId) {
        const client = this.clients.get(clientId);
        if (!client)
            return;
        const presenceUsers = presence_service_1.presenceService.getConversationPresence(conversationId);
        const statePayload = {
            conversationId,
            users: presenceUsers.map((user) => ({
                userId: user.userId,
                userName: user.userName,
                userEmail: user.userEmail,
                status: user.status,
                lastSeen: user.lastSeen.toISOString(),
            })),
        };
        client.send({
            type: types_1.WebSocketEventType.PRESENCE_STATE,
            payload: statePayload,
            timestamp: new Date().toISOString(),
            conversationId,
        });
    }
    /**
     * Handle client disconnection
     */
    handleDisconnection(clientId) {
        const client = this.clients.get(clientId);
        if (!client)
            return;
        // Remove user from all presence tracking
        presence_service_1.presenceService.removeUserFromAll(client.userId);
        // Notify all conversations the user was in
        client.conversationIds.forEach((conversationId) => {
            this.broadcastToConversation(conversationId, {
                type: types_1.WebSocketEventType.USER_LEFT,
                payload: {
                    userId: client.userId,
                    conversationId,
                },
                timestamp: new Date().toISOString(),
            }, clientId);
        });
        this.clients.delete(clientId);
        console.log(`❌ Client disconnected: ${clientId}`);
    }
    /**
     * Broadcast message to all clients in a conversation
     */
    broadcastToConversation(conversationId, message, excludeClientId) {
        this.clients.forEach((client) => {
            if (client.conversationIds.has(conversationId) &&
                client.id !== excludeClientId) {
                client.send(message);
            }
        });
    }
    /**
     * Broadcast message to specific user
     */
    broadcastToUser(userId, message) {
        this.clients.forEach((client) => {
            if (client.userId === userId) {
                client.send(message);
            }
        });
    }
    /**
     * Broadcast message to all connected clients
     */
    broadcastToAll(message, excludeClientId) {
        this.clients.forEach((client) => {
            if (client.id !== excludeClientId) {
                client.send(message);
            }
        });
    }
    /**
     * Get connected clients count
     */
    getClientsCount() {
        return this.clients.size;
    }
    /**
     * Get clients in a conversation
     */
    getConversationClients(conversationId) {
        return Array.from(this.clients.values()).filter((client) => client.conversationIds.has(conversationId));
    }
}
// Singleton instance
exports.wsManager = new WebSocketManager();
