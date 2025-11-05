"use strict";
/**
 * Yjs WebSocket Server
 *
 * Handles Yjs document synchronization over WebSocket for collaborative editing.
 * This server manages Y.Doc instances and broadcasts updates to connected clients.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.yjsServer = exports.YjsWebSocketServer = void 0;
const ws_1 = require("ws");
const Y = __importStar(require("yjs"));
const url_1 = require("url");
/**
 * Manages Yjs documents and client connections for collaborative editing
 */
class YjsWebSocketServer {
    wss = null;
    documents = new Map();
    clients = new Map();
    documentClients = new Map();
    /**
     * Initialize the Yjs WebSocket server
     */
    initialize(server) {
        this.wss = new ws_1.WebSocketServer({ noServer: true });
        this.wss.on('connection', (ws, request) => {
            this.handleConnection(ws, request);
        });
        console.log('✅ Yjs WebSocket server initialized');
    }
    /**
     * Handle WebSocket upgrade for Yjs connections
     */
    handleUpgrade(request, socket, head) {
        const { pathname } = (0, url_1.parse)(request.url || '');
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
    handleConnection(ws, request) {
        const { pathname, query } = (0, url_1.parse)(request.url || '', true);
        const documentId = pathname?.replace('/api/yjs/', '') || '';
        const userId = query.userId || 'anonymous';
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
        const client = { ws, documentId, userId };
        this.clients.set(ws, client);
        // Add to document clients
        if (!this.documentClients.has(documentId)) {
            this.documentClients.set(documentId, new Set());
        }
        this.documentClients.get(documentId).add(ws);
        console.log(`✅ Yjs client connected: ${userId} to document ${documentId}`);
        // Send current document state to new client
        const update = Y.encodeStateAsUpdate(doc);
        if (ws.readyState === ws_1.WebSocket.OPEN) {
            ws.send(update);
        }
        // Listen for document updates
        const updateHandler = (update, origin) => {
            // Don't broadcast if the update came from this client
            if (origin === ws)
                return;
            // Broadcast binary update to all other clients in this document
            this.broadcastToDocument(documentId, update, ws);
        };
        doc.on('update', updateHandler);
        // Handle incoming messages
        ws.on('message', (data) => {
            try {
                // Yjs sends binary data, apply updates directly
                if (data instanceof Buffer || data instanceof Uint8Array) {
                    Y.applyUpdate(doc, new Uint8Array(data), ws);
                }
            }
            catch (error) {
                console.error('Failed to handle Yjs message:', error);
            }
        });
        // Handle disconnection
        ws.on('close', () => {
            doc.off('update', updateHandler);
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
    handleDisconnection(ws) {
        const client = this.clients.get(ws);
        if (!client)
            return;
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
    broadcastToDocument(documentId, update, excludeWs) {
        const clients = this.documentClients.get(documentId);
        if (!clients)
            return;
        clients.forEach((clientWs) => {
            if (clientWs !== excludeWs && clientWs.readyState === ws_1.WebSocket.OPEN) {
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
            documentClients: Array.from(this.documentClients.entries()).map(([docId, clients]) => ({
                documentId: docId,
                clientCount: clients.size,
            })),
        };
    }
}
exports.YjsWebSocketServer = YjsWebSocketServer;
// Singleton instance
exports.yjsServer = new YjsWebSocketServer();
