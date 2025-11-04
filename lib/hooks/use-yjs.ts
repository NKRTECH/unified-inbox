/**
 * React Hook for Yjs Collaborative Editing
 * 
 * Provides a React hook to manage Yjs documents and providers
 * for collaborative editing features.
 */

import { useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import {
  getYjsDocumentManager,
  generateUserColor,
  type YjsProviderConfig,
} from '../collaboration/yjs-provider';

interface UseYjsOptions {
  /** Document identifier */
  documentId: string;
  /** User information */
  user: {
    id: string;
    name: string;
  };
  /** Enable/disable the provider */
  enabled?: boolean;
}

interface UseYjsReturn {
  /** Yjs document */
  doc: Y.Doc | null;
  /** WebSocket provider */
  provider: WebsocketProvider | null;
  /** Connection status */
  isConnected: boolean;
  /** Synced status */
  isSynced: boolean;
}

/**
 * Hook to manage Yjs document and provider for collaborative editing
 */
export function useYjs(options: UseYjsOptions): UseYjsReturn {
  const { documentId, user, enabled = true } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [isSynced, setIsSynced] = useState(false);
  const docRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);

  useEffect(() => {
    if (!enabled || !documentId) {
      return;
    }

    const manager = getYjsDocumentManager();
    
    // Get or create document
    const doc = manager.getDocument(documentId);
    docRef.current = doc;

    // Get WebSocket URL from environment or use default
    // The y-websocket library will append the documentId to this URL
    const baseWsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000';
    const wsUrl = `${baseWsUrl}/api/yjs`;

    // Create provider
    const provider = manager.createProvider({
      wsUrl,
      documentId,
      user: {
        id: user.id,
        name: user.name,
        color: generateUserColor(user.id),
      },
    });
    providerRef.current = provider;

    // Setup event listeners
    const handleStatus = ({ status }: { status: string }) => {
      setIsConnected(status === 'connected');
    };

    const handleSync = (isSynced: boolean) => {
      setIsSynced(isSynced);
    };

    provider.on('status', handleStatus);
    provider.on('sync', handleSync);

    // Cleanup
    return () => {
      provider.off('status', handleStatus);
      provider.off('sync', handleSync);
      manager.destroyProvider(documentId);
      docRef.current = null;
      providerRef.current = null;
    };
  }, [documentId, user.id, user.name, enabled]);

  return {
    doc: docRef.current,
    provider: providerRef.current,
    isConnected,
    isSynced,
  };
}
