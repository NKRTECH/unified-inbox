'use client';

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { 
  MessageResponse,
  MessageListResponse,
  CreateMessageInput,
  UpdateMessageInput,
  MessageQueryInput
} from '@/lib/types/message';

// Query keys for messages
export const messageKeys = {
  all: ['messages'] as const,
  lists: () => [...messageKeys.all, 'list'] as const,
  list: (params?: MessageQueryInput) => [...messageKeys.lists(), params] as const,
  infinite: (params?: Omit<MessageQueryInput, 'page'>) => 
    [...messageKeys.all, 'infinite', params] as const,
  details: () => [...messageKeys.all, 'detail'] as const,
  detail: (id: string) => [...messageKeys.details(), id] as const,
  byConversation: (conversationId: string) => 
    [...messageKeys.all, 'byConversation', conversationId] as const,
  byContact: (contactId: string) => 
    [...messageKeys.all, 'byContact', contactId] as const,
};

// API functions
async function fetchMessages(params?: MessageQueryInput): Promise<MessageListResponse> {
  const searchParams = new URLSearchParams();
  
  if (params?.conversationId) searchParams.append('conversationId', params.conversationId);
  if (params?.contactId) searchParams.append('contactId', params.contactId);
  if (params?.channel) searchParams.append('channel', params.channel);
  if (params?.direction) searchParams.append('direction', params.direction);
  if (params?.status) searchParams.append('status', params.status);
  if (params?.startDate) searchParams.append('startDate', params.startDate);
  if (params?.endDate) searchParams.append('endDate', params.endDate);
  if (params?.search) searchParams.append('search', params.search);
  if (params?.page) searchParams.append('page', params.page.toString());
  if (params?.limit) searchParams.append('limit', params.limit.toString());

  const response = await fetch(`/api/messages?${searchParams}`);
  if (!response.ok) {
    throw new Error('Failed to fetch messages');
  }
  return response.json();
}

async function fetchMessage(id: string): Promise<MessageResponse> {
  const response = await fetch(`/api/messages/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch message');
  }
  return response.json();
}

async function createMessage(data: CreateMessageInput): Promise<MessageResponse> {
  const response = await fetch('/api/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create message');
  }
  return response.json();
}

async function sendMessage(data: CreateMessageInput): Promise<MessageResponse> {
  const response = await fetch('/api/messages/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to send message');
  }
  return response.json();
}

async function updateMessage(id: string, data: UpdateMessageInput): Promise<MessageResponse> {
  const response = await fetch(`/api/messages/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to update message');
  }
  return response.json();
}

async function deleteMessage(id: string): Promise<void> {
  const response = await fetch(`/api/messages/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete message');
  }
}

// Hooks
export function useMessages(params?: MessageQueryInput) {
  return useQuery({
    queryKey: messageKeys.list(params),
    queryFn: () => fetchMessages(params),
    staleTime: 10 * 1000, // 10 seconds - messages change very frequently
  });
}

export function useInfiniteMessages(params?: Omit<MessageQueryInput, 'page'>) {
  return useInfiniteQuery({
    queryKey: messageKeys.infinite(params),
    queryFn: ({ pageParam = 1 }) => fetchMessages({ ...params, page: pageParam }),
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 10 * 1000, // 10 seconds
  });
}

export function useConversationMessages(conversationId: string) {
  return useInfiniteMessages({ conversationId, limit: 50 });
}

export function useMessage(id: string) {
  return useQuery({
    queryKey: messageKeys.detail(id),
    queryFn: () => fetchMessage(id),
    enabled: !!id,
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useCreateMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createMessage,
    onSuccess: (newMessage) => {
      // Add to message detail cache
      queryClient.setQueryData(messageKeys.detail(newMessage.id), newMessage);
      
      // Invalidate relevant message lists
      queryClient.invalidateQueries({ queryKey: messageKeys.lists() });
      queryClient.invalidateQueries({ 
        queryKey: messageKeys.byConversation(newMessage.conversationId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: messageKeys.byContact(newMessage.contactId) 
      });
      
      // Update infinite queries for the conversation
      queryClient.invalidateQueries({ 
        queryKey: messageKeys.infinite({ conversationId: newMessage.conversationId }) 
      });
    },
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sendMessage,
    onMutate: async (newMessage) => {
      // Create optimistic message
      const optimisticMessage: MessageResponse = {
        id: `temp-${Date.now()}`,
        ...newMessage,
        status: 'SENT',
        sentAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sender: undefined, // Will be filled by server
        contact: {
          id: newMessage.contactId,
          name: null,
          phone: null,
          email: null,
        },
        conversation: {
          id: newMessage.conversationId,
          status: 'ACTIVE',
          priority: 'NORMAL',
        },
      };

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: messageKeys.infinite({ conversationId: newMessage.conversationId, limit: 50 }) 
      });

      // Snapshot the previous value
      const previousMessages = queryClient.getQueryData(
        messageKeys.infinite({ conversationId: newMessage.conversationId, limit: 50 })
      );

      // Optimistically update the infinite query
      queryClient.setQueryData(
        messageKeys.infinite({ conversationId: newMessage.conversationId, limit: 50 }),
        (old: any) => {
          if (!old) return old;
          
          const newPages = [...old.pages];
          if (newPages[0]) {
            newPages[0] = {
              ...newPages[0],
              messages: [...newPages[0].messages, optimisticMessage],
            };
          }
          
          return {
            ...old,
            pages: newPages,
          };
        }
      );

      return { previousMessages, optimisticMessage };
    },
    onError: (err, newMessage, context) => {
      // If the mutation fails, use the context to roll back
      if (context?.previousMessages) {
        queryClient.setQueryData(
          messageKeys.infinite({ conversationId: newMessage.conversationId, limit: 50 }),
          context.previousMessages
        );
      }
    },
    onSuccess: (sentMessage, variables, context) => {
      // Replace optimistic message with real message
      queryClient.setQueryData(
        messageKeys.infinite({ conversationId: sentMessage.conversationId, limit: 50 }),
        (old: any) => {
          if (!old) return old;
          
          const newPages = old.pages.map((page: any) => ({
            ...page,
            messages: page.messages.map((msg: MessageResponse) =>
              msg.id === context?.optimisticMessage.id ? sentMessage : msg
            ),
          }));
          
          return {
            ...old,
            pages: newPages,
          };
        }
      );

      // Add to message detail cache
      queryClient.setQueryData(messageKeys.detail(sentMessage.id), sentMessage);
    },
    onSettled: (data, error, variables) => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ 
        queryKey: messageKeys.infinite({ conversationId: variables.conversationId, limit: 50 }) 
      });
      queryClient.invalidateQueries({ queryKey: messageKeys.lists() });
      
      // Also invalidate conversations to update last message
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useUpdateMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMessageInput }) =>
      updateMessage(id, data),
    onSuccess: (updatedMessage) => {
      // Update message detail cache
      queryClient.setQueryData(messageKeys.detail(updatedMessage.id), updatedMessage);
      
      // Update in infinite queries
      queryClient.setQueriesData(
        { queryKey: messageKeys.infinite() },
        (old: any) => {
          if (!old) return old;
          
          const newPages = old.pages.map((page: any) => ({
            ...page,
            messages: page.messages.map((msg: MessageResponse) =>
              msg.id === updatedMessage.id ? updatedMessage : msg
            ),
          }));
          
          return {
            ...old,
            pages: newPages,
          };
        }
      );
      
      // Invalidate relevant lists
      queryClient.invalidateQueries({ queryKey: messageKeys.lists() });
    },
  });
}

export function useDeleteMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteMessage,
    onSuccess: (_, deletedId) => {
      // Remove from detail cache
      queryClient.removeQueries({ queryKey: messageKeys.detail(deletedId) });
      
      // Remove from infinite queries
      queryClient.setQueriesData(
        { queryKey: messageKeys.infinite() },
        (old: any) => {
          if (!old) return old;
          
          const newPages = old.pages.map((page: any) => ({
            ...page,
            messages: page.messages.filter((msg: MessageResponse) => msg.id !== deletedId),
          }));
          
          return {
            ...old,
            pages: newPages,
          };
        }
      );
      
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: messageKeys.lists() });
    },
  });
}

// Utility hook for real-time message updates
export function useMessageRealTimeUpdates(conversationId: string) {
  const queryClient = useQueryClient();

  const addMessage = (message: MessageResponse) => {
    // Add to infinite query
    queryClient.setQueryData(
      messageKeys.infinite({ conversationId, limit: 50 }),
      (old: any) => {
        if (!old) return old;
        
        const newPages = [...old.pages];
        if (newPages[0]) {
          // Check if message already exists to avoid duplicates
          const messageExists = newPages[0].messages.some((msg: MessageResponse) => msg.id === message.id);
          if (!messageExists) {
            newPages[0] = {
              ...newPages[0],
              messages: [...newPages[0].messages, message],
            };
          }
        }
        
        return {
          ...old,
          pages: newPages,
        };
      }
    );

    // Add to detail cache
    queryClient.setQueryData(messageKeys.detail(message.id), message);
  };

  const updateMessage = (message: MessageResponse) => {
    // Update in infinite queries
    queryClient.setQueryData(
      messageKeys.infinite({ conversationId, limit: 50 }),
      (old: any) => {
        if (!old) return old;
        
        const newPages = old.pages.map((page: any) => ({
          ...page,
          messages: page.messages.map((msg: MessageResponse) =>
            msg.id === message.id ? message : msg
          ),
        }));
        
        return {
          ...old,
          pages: newPages,
        };
      }
    );

    // Update detail cache
    queryClient.setQueryData(messageKeys.detail(message.id), message);
  };

  return { addMessage, updateMessage };
}