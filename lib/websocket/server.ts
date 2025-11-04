/**
 * WebSocket Server Implementation
 * Manages real-time connections and message broadcasting
 */

import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { parse } from 'url';
import {
  WebSocketMessage,
  WebSocketEventType,
  WebSocketClient,
  PresencePayload,
  PresenceStatePayload,
} from './types';
import { presenceService } from '../services/presence-service';

type UpgradeListener = (
  request: IncomingMessage,
  socket: any,
  head: Buffer
) => void;

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WebSocketClient> = new Map();
  private upgradeListeners: UpgradeListener[] = [];

  /**
   * Initialize WebSocket server
   */
  initialize(
    server: any,
    existingUpgradeListeners: UpgradeListener[] = []
  ) {
    this.wss = new WebSocketServer({ noServer: true });
    this.upgradeListeners = [...existingUpgradeListeners];

    this.wss.on('connection', (ws: WebSocket, request: IncomingMessage) => {
      this.handleConnection(ws, request);
    });

    const handleUpgrade: UpgradeListener = (
      request: IncomingMessage,
      socket: any,
      head: Buffer
    ) => {
      const { pathname } = parse(request.url || '');

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
    const captureUpgradeListener = (
      event: string | symbol,
      listener: (...args: unknown[]) => void
    ) => {
      if (event !== 'upgrade') return;
      if (listener === handleUpgrade) return;

      const upgradeListener = listener as UpgradeListener;

      if (!this.upgradeListeners.includes(upgradeListener)) {
        this.upgradeListeners.push(upgradeListener);
      }

      // Remove the listener from the server so it's only invoked manually
      setImmediate(() => {
        server.removeListener('upgrade', upgradeListener as any);
      });
    };

    server.on('newListener', captureUpgradeListener);
    server.on('upgrade', handleUpgrade);

    console.log('✅ WebSocket server initialized');
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WebSocket, request: IncomingMessage) {
    const { query } = parse(request.url || '', true);
    const userId = query.userId as string;
    const clientId = `${userId}-${Date.now()}`;

    if (!userId) {
      console.error('❌ Connection rejected: No userId provided');
      ws.close(1008, 'User ID required');
      return;
    }

    const client: WebSocketClient = {
      id: clientId,
      userId,
      conversationIds: new Set(),
      send: (message: WebSocketMessage) => {
        if (ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(JSON.stringify(message));
          } catch (error) {
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
        type: WebSocketEventType.CONNECTED,
        payload: { clientId, userId },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
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
    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString()) as WebSocketMessage;
        this.handleMessage(clientId, message);
      } catch (error) {
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
  private handleMessage(clientId: string, message: WebSocketMessage) {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (message.type) {
      case WebSocketEventType.USER_JOINED:
        if (message.conversationId) {
          client.conversationIds.add(message.conversationId);
          
          // Update presence
          const payload = message.payload as PresencePayload;
          presenceService.updatePresence(
            message.conversationId,
            client.userId,
            payload.userName || 'Unknown',
            'viewing',
            payload.userEmail
          );
          
          // Send current presence state to the joining user
          this.sendPresenceState(clientId, message.conversationId);
          
          // Broadcast join to others
          this.broadcastToConversation(message.conversationId, message, clientId);
        }
        break;

      case WebSocketEventType.USER_LEFT:
        if (message.conversationId) {
          client.conversationIds.delete(message.conversationId);
          
          // Remove presence
          presenceService.removePresence(message.conversationId, client.userId);
          
          this.broadcastToConversation(message.conversationId, message, clientId);
        }
        break;

      case WebSocketEventType.PRESENCE_UPDATE:
        if (message.conversationId) {
          const payload = message.payload as PresencePayload;
          
          // Update presence status
          presenceService.updatePresence(
            message.conversationId,
            client.userId,
            payload.userName || 'Unknown',
            payload.status || 'viewing',
            payload.userEmail
          );
          
          // Broadcast presence update
          this.broadcastToConversation(message.conversationId, message, clientId);
        }
        break;

      case WebSocketEventType.TYPING_START:
      case WebSocketEventType.TYPING_STOP:
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
  private sendPresenceState(clientId: string, conversationId: string) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const presenceUsers = presenceService.getConversationPresence(conversationId);
    
    const statePayload: PresenceStatePayload = {
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
      type: WebSocketEventType.PRESENCE_STATE,
      payload: statePayload,
      timestamp: new Date().toISOString(),
      conversationId,
    });
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnection(clientId: string) {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Remove user from all presence tracking
    presenceService.removeUserFromAll(client.userId);

    // Notify all conversations the user was in
    client.conversationIds.forEach((conversationId) => {
      this.broadcastToConversation(conversationId, {
        type: WebSocketEventType.USER_LEFT,
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
  broadcastToConversation(
    conversationId: string,
    message: WebSocketMessage,
    excludeClientId?: string
  ) {
    this.clients.forEach((client) => {
      if (
        client.conversationIds.has(conversationId) &&
        client.id !== excludeClientId
      ) {
        client.send(message);
      }
    });
  }

  /**
   * Broadcast message to specific user
   */
  broadcastToUser(userId: string, message: WebSocketMessage) {
    this.clients.forEach((client) => {
      if (client.userId === userId) {
        client.send(message);
      }
    });
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcastToAll(message: WebSocketMessage, excludeClientId?: string) {
    this.clients.forEach((client) => {
      if (client.id !== excludeClientId) {
        client.send(message);
      }
    });
  }

  /**
   * Get connected clients count
   */
  getClientsCount(): number {
    return this.clients.size;
  }

  /**
   * Get clients in a conversation
   */
  getConversationClients(conversationId: string): WebSocketClient[] {
    return Array.from(this.clients.values()).filter((client) =>
      client.conversationIds.has(conversationId)
    );
  }
}

// Singleton instance
export const wsManager = new WebSocketManager();
