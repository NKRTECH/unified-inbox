'use client';

import { useQueryClient } from '@tanstack/react-query';
import { conversationKeys } from './use-conversations';
import { messageKeys } from './use-messages';

/**
 * Hook for managing query cache invalidation patterns
 * Provides centralized methods for invalidating related queries
 */
export function useQueryInvalidation() {
  const queryClient = useQueryClient();

  const invalidateConversations = () => {
    queryClient.invalidateQueries({ queryKey: conversationKeys.all });
  };

  const invalidateConversation = (conversationId: string) => {
    queryClient.invalidateQueries({ queryKey: conversationKeys.detail(conversationId) });
  };

  const invalidateMessages = () => {
    queryClient.invalidateQueries({ queryKey: messageKeys.all });
  };

  const invalidateConversationMessages = (conversationId: string) => {
    queryClient.invalidateQueries({ 
      queryKey: messageKeys.byConversation(conversationId) 
    });
    queryClient.invalidateQueries({ 
      queryKey: messageKeys.infinite({ conversationId }) 
    });
  };

  const invalidateContactMessages = (contactId: string) => {
    queryClient.invalidateQueries({ 
      queryKey: messageKeys.byContact(contactId) 
    });
  };

  // Invalidate all data related to a conversation (conversation + messages)
  const invalidateConversationData = (conversationId: string) => {
    invalidateConversation(conversationId);
    invalidateConversationMessages(conversationId);
  };

  // Invalidate all data related to a contact
  const invalidateContactData = (contactId: string) => {
    queryClient.invalidateQueries({ 
      queryKey: conversationKeys.all,
      predicate: (query) => {
        const data = query.state.data as any;
        return data?.contact?.id === contactId || 
               data?.conversations?.some((conv: any) => conv.contactId === contactId);
      }
    });
    invalidateContactMessages(contactId);
  };

  // Clear all cached data (useful for logout)
  const clearAllCache = () => {
    queryClient.clear();
  };

  // Prefetch conversation data
  const prefetchConversation = (conversationId: string) => {
    queryClient.prefetchQuery({
      queryKey: conversationKeys.detail(conversationId),
      queryFn: async () => {
        const response = await fetch(`/api/conversations/${conversationId}`);
        if (!response.ok) throw new Error('Failed to fetch conversation');
        return response.json();
      },
      staleTime: 60 * 1000, // 1 minute
    });
  };

  // Prefetch conversation messages
  const prefetchConversationMessages = (conversationId: string) => {
    queryClient.prefetchInfiniteQuery({
      queryKey: messageKeys.infinite({ conversationId, limit: 50 }),
      queryFn: async ({ pageParam = 1 }) => {
        const response = await fetch(
          `/api/messages?conversationId=${conversationId}&page=${pageParam}&limit=50`
        );
        if (!response.ok) throw new Error('Failed to fetch messages');
        return response.json();
      },
      initialPageParam: 1,
      staleTime: 10 * 1000, // 10 seconds
    });
  };

  return {
    // Invalidation methods
    invalidateConversations,
    invalidateConversation,
    invalidateMessages,
    invalidateConversationMessages,
    invalidateContactMessages,
    invalidateConversationData,
    invalidateContactData,
    clearAllCache,
    
    // Prefetch methods
    prefetchConversation,
    prefetchConversationMessages,
    
    // Direct query client access for advanced use cases
    queryClient,
  };
}