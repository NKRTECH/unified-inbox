/**
 * WebSocket Client Utilities
 * Helper functions for client-side WebSocket operations
 */

import {
  WebSocketMessage,
  WebSocketEventType,
  MessagePayload,
  TypingPayload,
} from './types';

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<WebSocketEventType, Set<(payload: any) => void>> = new Map();
  private userId: string;
  private isIntentionallyClosed = false;
  private connectPromise: Promise<void> | null = null;
  private pendingMessages: WebSocketMessage[] = [];
  private refCount = 0;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Connect to WebSocket server
   */
  connect(): Promise<void> {
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
          this.ws!.onopen = () => {
            console.log('✅ WebSocket connected');
            this.reconnectAttempts = 0;
            this.flushPendingMessages();
            this.connectPromise = null;
            this.emitEvent(WebSocketEventType.CONNECTED, { userId: this.userId });
            innerResolve();
            resolve();
          };

          this.ws!.onmessage = (event) => {
            try {
              const message = JSON.parse(event.data) as WebSocketMessage;
              this.handleMessage(message);
            } catch (error) {
              console.error('Failed to parse WebSocket message:', error);
            }
          };

          this.ws!.onclose = (event) => {
            console.log('❌ WebSocket disconnected', event.code, event.reason);
            this.ws = null;
            this.connectPromise = null;

            this.emitEvent(WebSocketEventType.DISCONNECTED, {
              code: event.code,
              reason: event.reason,
            });

            // Attempt reconnection if not intentionally closed
            if (!this.isIntentionallyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
              this.attemptReconnect();
            }
          };

          this.ws!.onerror = (error) => {
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
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect() {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms...`);
    
    setTimeout(() => {
      this.connect()
        .then(() => {
          this.emitEvent(WebSocketEventType.CONNECTED, { userId: this.userId });
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
  private send(message: WebSocketMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      this.queueMessage(message);
    }
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(message: WebSocketMessage) {
    const listeners = this.listeners.get(message.type);
    if (listeners) {
      listeners.forEach((callback) => callback(message.payload));
    }
  }

  private queueMessage(message: WebSocketMessage) {
    this.pendingMessages.push(message);

    if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
      this.connect().catch((error) => {
        console.error('Failed to connect while queueing message:', error);
      });
    }
  }

  private flushPendingMessages() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    while (this.pendingMessages.length > 0) {
      const message = this.pendingMessages.shift();
      if (message) {
        try {
          this.ws.send(JSON.stringify(message));
        } catch (error) {
          console.error('Failed to send queued WebSocket message:', error);
          break;
        }
      }
    }
  }

  private emitEvent(eventType: WebSocketEventType, payload: any) {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.forEach((callback) => callback(payload));
    }
  }

  retain() {
    this.refCount += 1;
  }

  release(): boolean {
    this.refCount = Math.max(0, this.refCount - 1);

    if (this.refCount === 0) {
      this.dispose();
      return true;
    }

    return false;
  }

  private dispose() {
    this.isIntentionallyClosed = true;
    this.pendingMessages = [];
    this.connectPromise = null;
    this.refCount = 0;

    if (this.ws) {
      try {
        this.ws.close();
      } catch (error) {
        console.error('Failed to close WebSocket cleanly:', error);
      }
      this.ws = null;
    }

    this.listeners.clear();
  }
  /**
   * Subscribe to WebSocket events
   */
  on(eventType: WebSocketEventType, callback: (payload: any) => void) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);

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
  joinConversation(conversationId: string) {
    this.send({
      type: WebSocketEventType.USER_JOINED,
      payload: { userId: this.userId, conversationId },
      timestamp: new Date().toISOString(),
      conversationId,
    });
  }

  /**
   * Leave a conversation room
   */
  leaveConversation(conversationId: string) {
    this.send({
      type: WebSocketEventType.USER_LEFT,
      payload: { userId: this.userId, conversationId },
      timestamp: new Date().toISOString(),
      conversationId,
    });
  }

  /**
   * Send typing indicator
   */
  sendTypingStart(conversationId: string, userName: string) {
    this.send({
      type: WebSocketEventType.TYPING_START,
      payload: { userId: this.userId, userName, conversationId } as TypingPayload,
      timestamp: new Date().toISOString(),
      conversationId,
    });
  }

  /**
   * Stop typing indicator
   */
  sendTypingStop(conversationId: string, userName: string) {
    this.send({
      type: WebSocketEventType.TYPING_STOP,
      payload: { userId: this.userId, userName, conversationId } as TypingPayload,
      timestamp: new Date().toISOString(),
      conversationId,
    });
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

const clientRegistry = new Map<string, WebSocketClient>();

export function acquireWebSocketClient(userId: string): WebSocketClient {
  let client = clientRegistry.get(userId);

  if (!client) {
    client = new WebSocketClient(userId);
    clientRegistry.set(userId, client);
  }

  client.retain();
  return client;
}

export function releaseWebSocketClient(userId: string) {
  const client = clientRegistry.get(userId);
  if (!client) return;

  const shouldDispose = client.release();

  if (shouldDispose) {
    clientRegistry.delete(userId);
  }
}
