'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ConversationWithRelations, 
  ConversationListResponse,
  CreateConversationInput,
  UpdateConversationInput,
  ConversationFilters,
  ConversationSort
} from '@/lib/types/conversation';

// Query keys for conversations
export const conversationKeys = {
  all: ['conversations'] as const,
  lists: () => [...conversationKeys.all, 'list'] as const,
  list: (filters?: ConversationFilters, sort?: ConversationSort, page?: number, limit?: number) => 
    [...conversationKeys.lists(), { filters, sort, page, limit }] as const,
  details: () => [...conversationKeys.all, 'detail'] as const,
  detail: (id: string) => [...conversationKeys.details(), id] as const,
  byContact: (contactId: string) => [...conversationKeys.all, 'byContact', contactId] as const,
};

// API functions
async function fetchConversations(
  filters?: ConversationFilters,
  sort?: ConversationSort,
  page = 1,
  limit = 20
): Promise<ConversationListResponse> {
  const params = new URLSearchParams();
  
  if (filters?.status) params.append('status', filters.status);
  if (filters?.priority) params.append('priority', filters.priority);
  if (filters?.assignedTo) params.append('assignedTo', filters.assignedTo);
  if (filters?.contactId) params.append('contactId', filters.contactId);
  if (sort?.field) params.append('sortField', sort.field);
  if (sort?.order) params.append('sortOrder', sort.order);
  params.append('page', page.toString());
  params.append('limit', limit.toString());

  const response = await fetch(`/api/conversations?${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch conversations');
  }
  return response.json();
}

async function fetchConversation(id: string): Promise<ConversationWithRelations> {
  const response = await fetch(`/api/conversations/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch conversation');
  }
  return response.json();
}

async function createConversation(data: CreateConversationInput): Promise<ConversationWithRelations> {
  const response = await fetch('/api/conversations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to create conversation');
  }
  return response.json();
}

async function updateConversation(
  id: string, 
  data: UpdateConversationInput
): Promise<ConversationWithRelations> {
  const response = await fetch(`/api/conversations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to update conversation');
  }
  return response.json();
}

async function deleteConversation(id: string): Promise<void> {
  const response = await fetch(`/api/conversations/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete conversation');
  }
}

// Hooks
export function useConversations(
  filters?: ConversationFilters,
  sort?: ConversationSort,
  page = 1,
  limit = 20
) {
  return useQuery({
    queryKey: conversationKeys.list(filters, sort, page, limit),
    queryFn: () => fetchConversations(filters, sort, page, limit),
    staleTime: 30 * 1000, // 30 seconds - conversations change frequently
  });
}

export function useConversation(id: string) {
  return useQuery({
    queryKey: conversationKeys.detail(id),
    queryFn: () => fetchConversation(id),
    enabled: !!id,
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createConversation,
    onSuccess: (newConversation) => {
      // Invalidate and refetch conversations list
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
      
      // Add the new conversation to the cache
      queryClient.setQueryData(
        conversationKeys.detail(newConversation.id),
        newConversation
      );
    },
  });
}

export function useUpdateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateConversationInput }) =>
      updateConversation(id, data),
    onSuccess: (updatedConversation) => {
      // Update the conversation in the cache
      queryClient.setQueryData(
        conversationKeys.detail(updatedConversation.id),
        updatedConversation
      );
      
      // Invalidate conversations list to reflect changes
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
    },
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteConversation,
    onSuccess: (_, deletedId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: conversationKeys.detail(deletedId) });
      
      // Invalidate conversations list
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
    },
  });
}

// Optimistic update hook for conversation status changes
export function useOptimisticConversationUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateConversationInput }) =>
      updateConversation(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: conversationKeys.detail(id) });

      // Snapshot the previous value
      const previousConversation = queryClient.getQueryData(conversationKeys.detail(id));

      // Optimistically update to the new value
      if (previousConversation) {
        queryClient.setQueryData(conversationKeys.detail(id), (old: any) => ({
          ...old,
          ...data,
          updatedAt: new Date().toISOString(),
        }));
      }

      // Return a context object with the snapshotted value
      return { previousConversation, id };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousConversation) {
        queryClient.setQueryData(
          conversationKeys.detail(context.id),
          context.previousConversation
        );
      }
    },
    onSettled: (data, error, variables) => {
      // Always refetch after error or success to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: conversationKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
    },
  });
}