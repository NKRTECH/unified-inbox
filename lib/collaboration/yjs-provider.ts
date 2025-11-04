/**
 * Yjs Provider for Collaborative Editing
 * 
 * This module provides the Yjs document management service for conflict-free
 * collaborative editing using CRDTs (Conflict-free Replicated Data Types).
 */

import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

/**
 * Configuration for Yjs WebSocket provider
 */
export interface YjsProviderConfig {
  /** WebSocket server URL */
  wsUrl: string;
  /** Document identifier (typically conversationId or noteId) */
  documentId: string;
  /** User information for awareness */
  user: {
    id: string;
    name: string;
    color: string;
  };
}

/**
 * Manages Yjs documents and WebSocket connections for collaborative editing
 */
export class YjsDocumentManager {
  private documents: Map<string, Y.Doc> = new Map();
  private providers: Map<string, WebsocketProvider> = new Map();

  /**
   * Get or create a Yjs document for a given ID
   */
  getDocument(documentId: string): Y.Doc {
    if (!this.documents.has(documentId)) {
      const doc = new Y.Doc();
      this.documents.set(documentId, doc);
    }
    return this.documents.get(documentId)!;
  }

  /**
   * Create a WebSocket provider for collaborative editing
   */
  createProvider(config: YjsProviderConfig): WebsocketProvider {
    const { wsUrl, documentId, user } = config;

    // Check if provider already exists
    if (this.providers.has(documentId)) {
      return this.providers.get(documentId)!;
    }

    const doc = this.getDocument(documentId);
    const provider = new WebsocketProvider(wsUrl, documentId, doc, {
      connect: true,
    });

    // Set user awareness information
    provider.awareness.setLocalStateField('user', {
      id: user.id,
      name: user.name,
      color: user.color,
    });

    this.providers.set(documentId, provider);

    return provider;
  }

  /**
   * Disconnect and cleanup a provider
   */
  destroyProvider(documentId: string): void {
    const provider = this.providers.get(documentId);
    if (provider) {
      provider.disconnect();
      provider.destroy();
      this.providers.delete(documentId);
    }

    const doc = this.documents.get(documentId);
    if (doc) {
      doc.destroy();
      this.documents.delete(documentId);
    }
  }

  /**
   * Get active provider for a document
   */
  getProvider(documentId: string): WebsocketProvider | undefined {
    return this.providers.get(documentId);
  }

  /**
   * Cleanup all providers and documents
   */
  destroyAll(): void {
    this.providers.forEach((provider) => {
      provider.disconnect();
      provider.destroy();
    });
    this.documents.forEach((doc) => doc.destroy());
    this.providers.clear();
    this.documents.clear();
  }
}

// Singleton instance
let documentManager: YjsDocumentManager | null = null;

/**
 * Get the singleton Yjs document manager instance
 */
export function getYjsDocumentManager(): YjsDocumentManager {
  if (!documentManager) {
    documentManager = new YjsDocumentManager();
  }
  return documentManager;
}

/**
 * Generate a random color for user cursor
 */
export function generateUserColor(userId: string): string {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788',
  ];
  
  // Generate consistent color based on userId
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}
