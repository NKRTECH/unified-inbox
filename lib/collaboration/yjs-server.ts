/**
 * Yjs WebSocket Server
 * 
 * Handles Yjs document synchronization over WebSocket for collaborative editing.
 * This server manages Y.Doc instances and broadcasts updates to connected clients.
 */

import { WebSocket, WebSocketServer } from 'ws';
import * as Y from 'yjs';
import { IncomingMessage } from 'http';
import { parse } from 'url';

interface YjsClient {
  ws: WebSocket;
  documentId: string;
  userId: string;
}

/**
 * Manages Yjs documents and client connections for collaborative editing
 */
export class YjsWebSocketServer {
  private wss: WebSocketServer | null = null;
  private documents: Map<string, Y.Doc> = new Map();
  private clients: Map<WebSocket, YjsClient> = new Map();
  private documentClients: Map<string, Set<WebSocket>> = new Map();

  /**
   * Initialize the Yjs WebSocket server
   */
  initialize(server: any) {
    this.wss = new WebSocketServer({ noServer: true });

    this.wss.on('connection', (ws: WebSocket, request: IncomingMessage) => {
      this.handleConnection(ws, request);
    });

    console.log('✅ Yjs WebSocket server initialized');
  }

  /**
   * Handle WebSocket upgrade for Yjs connections
   */
  handleUpgrade(request: IncomingMessage, socket: any, head: Buffer) {
    const { pathname } = parse(request.url || '');

    if (pathname?.startsWith('/api/yjs/')) {
      this.wss?.handleUpgrade(request, socket, head, (ws) => {
        this.wss?.emit('connection', ws, request);
      });
      return true;
    }

    return false;
  }

  /**
   * Handle new client connection
   */
  private handleConnection(ws: WebSocket, request: IncomingMessage) {
    const { pathname, query } = parse(request.url || '', true);
    const documentId = pathname?.replace('/api/yjs/', '') || '';
    const userId = (query.userId as string) || 'anonymous';

    if (!documentId) {
      console.error('❌ Yjs connection rejected: No document ID');
      ws.close(1008, 'Document ID required');
      return;
    }

    // Get or create document
    let doc = this.documents.get(documentId);
    if (!doc) {
      doc = new Y.Doc();
      this.documents.set(documentId, doc);
      console.log(`📄 Created new Yjs document: ${documentId}`);
    }

    // Register client
    const client: YjsClient = { ws, documentId, userId };
    this.clients.set(ws, client);

    // Add to document clients
    if (!this.documentClients.has(documentId)) {
      this.documentClients.set(documentId, new Set());
    }
    this.documentClients.get(documentId)!.add(ws);

    console.log(`✅ Yjs client connected: ${userId} to document ${documentId}`);

    // Send current document state to new client
    const update = Y.encodeStateAsUpdate(doc);
    
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(update);
    }

    // Listen for document updates
    const updateHandler = (update: Uint8Array, origin: any) => {
      // Don't broadcast if the update came from this client
      if (origin === ws) return;

      // Broadcast binary update to all other clients in this document
      this.broadcastToDocument(documentId, update, ws);
    };

    doc.on('update', updateHandler);

    // Handle incoming messages
    ws.on('message', (data: Buffer) => {
      try {
        // Yjs sends binary data, apply updates directly
        if (data instanceof Buffer || data instanceof Uint8Array) {
          Y.applyUpdate(doc!, new Uint8Array(data), ws);
        }
      } catch (error) {
        console.error('Failed to handle Yjs message:', error);
      }
    });

    // Handle disconnection
    ws.on('close', () => {
      doc!.off('update', updateHandler);
      this.handleDisconnection(ws);
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error(`❌ Yjs WebSocket error:`, error);
    });

    // Keep connection alive
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
    }, 30000);

    ws.on('close', () => clearInterval(pingInterval));
  }



  /**
   * Handle client disconnection
   */
  private handleDisconnection(ws: WebSocket) {
    const client = this.clients.get(ws);
    if (!client) return;

    const { documentId, userId } = client;

    // Remove from document clients
    const docClients = this.documentClients.get(documentId);
    if (docClients) {
      docClients.delete(ws);

      // Clean up document if no clients remain
      if (docClients.size === 0) {
        this.documentClients.delete(documentId);
        const doc = this.documents.get(documentId);
        if (doc) {
          doc.destroy();
          this.documents.delete(documentId);
          console.log(`🗑️  Destroyed Yjs document: ${documentId}`);
        }
      }
    }

    this.clients.delete(ws);
    console.log(`❌ Yjs client disconnected: ${userId} from document ${documentId}`);
  }

  /**
   * Broadcast binary update to all clients in a document
   */
  private broadcastToDocument(
    documentId: string,
    update: Uint8Array,
    excludeWs?: WebSocket
  ) {
    const clients = this.documentClients.get(documentId);
    if (!clients) return;

    clients.forEach((clientWs) => {
      if (clientWs !== excludeWs && clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(update);
      }
    });
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      documents: this.documents.size,
      clients: this.clients.size,
      documentClients: Array.from(this.documentClients.entries()).map(
        ([docId, clients]) => ({
          documentId: docId,
          clientCount: clients.size,
        })
      ),
    };
  }
}

// Singleton instance
export const yjsServer = new YjsWebSocketServer();
