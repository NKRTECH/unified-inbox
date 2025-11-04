'use client';

import { useState } from 'react';
import { useConversations } from '@/lib/hooks';
import { ConversationFilters, ConversationSort } from '@/lib/types/conversation';
import { ConversationItem } from './conversation-item';
import { ConversationListSkeleton } from './conversation-list-skeleton';
import { ConversationListFilters } from './conversation-list-filters';

interface ConversationListProps {
  onSelectConversation?: (conversationId: string) => void;
  selectedConversationId?: string;
}

/**
 * ConversationList component displays a virtualized list of conversations
 * with filtering, sorting, and real-time updates
 */
export function ConversationList({
  onSelectConversation,
  selectedConversationId,
}: ConversationListProps) {
  const [filters, setFilters] = useState<ConversationFilters>({});
  const [sort, setSort] = useState<ConversationSort>({
    field: 'updatedAt',
    order: 'desc',
  });
  const [page] = useState(1);
  const limit = 50;

  const { data, isLoading, error } = useConversations(filters, sort, page, limit);

  const handleFilterChange = (newFilters: ConversationFilters) => {
    setFilters(newFilters);
  };

  const handleSortChange = (newSort: ConversationSort) => {
    setSort(newSort);
  };

  if (isLoading) {
    return <ConversationListSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <div className="text-red-600 mb-2">
          <svg
            className="w-12 h-12 mx-auto"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          Failed to load conversations
        </h3>
        <p className="text-sm text-gray-500">
          {error instanceof Error ? error.message : 'An error occurred'}
        </p>
      </div>
    );
  }

  const conversations = data?.conversations || [];
  const totalCount = data?.pagination.total || 0;

  // Calculate unread count (placeholder - will be implemented with real data)
  const unreadCount = conversations.filter((conv) => conv.status === 'ACTIVE').length;

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium text-gray-900">Conversations</h2>
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {unreadCount} active
              </span>
            )}
            <span className="text-sm text-gray-500">{totalCount} total</span>
          </div>
        </div>

        {/* Filters */}
        <ConversationListFilters
          filters={filters}
          sort={sort}
          onFilterChange={handleFilterChange}
          onSortChange={handleSortChange}
        />
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-200">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <div className="text-gray-400 mb-2">
              <svg
                className="w-12 h-12 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              No conversations found
            </h3>
            <p className="text-sm text-gray-500">
              {Object.keys(filters).length > 0
                ? 'Try adjusting your filters'
                : 'Start a new conversation to get started'}
            </p>
          </div>
        ) : (
          conversations.map((conversation) => (
            <ConversationItem
              key={conversation.id}
              conversation={conversation}
              isSelected={conversation.id === selectedConversationId}
              onClick={() => onSelectConversation?.(conversation.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}