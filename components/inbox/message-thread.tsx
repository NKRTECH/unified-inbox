'use client';

import { useEffect, useRef } from 'react';
import { useConversationMessages } from '@/lib/hooks';
import { MessageItem } from './message-item';
import { MessageThreadSkeleton } from './message-thread-skeleton';
import { Button } from '@/components/ui/button';

interface MessageThreadProps {
  conversationId: string;
}

/**
 * MessageThread component displays conversation messages
 * with channel indicators, timestamps, and direction (inbound/outbound)
 */
export function MessageThread({ conversationId }: MessageThreadProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useConversationMessages(conversationId);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (data?.pages[0]?.messages.length) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [data?.pages[0]?.messages.length]);

  if (isLoading) {
    return <MessageThreadSkeleton />;
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
          Failed to load messages
        </h3>
        <p className="text-sm text-gray-500">
          {error instanceof Error ? error.message : 'An error occurred'}
        </p>
      </div>
    );
  }

  const allMessages = data?.pages.flatMap((page) => page.messages) || [];

  // Group messages by date
  const groupedMessages = allMessages.reduce((groups, message) => {
    const date = new Date(message.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, typeof allMessages>);

  return (
    <div className="flex flex-col h-full">
      {/* Load More Button (at top for older messages) */}
      {hasNextPage && (
        <div className="p-4 border-b border-gray-200 flex justify-center">
          <Button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            variant="outline"
            size="sm"
          >
            {isFetchingNextPage ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Loading...
              </>
            ) : (
              'Load older messages'
            )}
          </Button>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {allMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-gray-400 mb-2">
              <svg
                className="w-16 h-16 mx-auto"
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
              No messages yet
            </h3>
            <p className="text-sm text-gray-500">
              Start the conversation by sending a message below
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedMessages).map(([date, messages]) => (
              <div key={date}>
                {/* Date Divider */}
                <div className="flex items-center justify-center mb-4">
                  <div className="flex-1 border-t border-gray-200" />
                  <span className="px-3 text-xs font-medium text-gray-500 bg-white">
                    {date}
                  </span>
                  <div className="flex-1 border-t border-gray-200" />
                </div>

                {/* Messages for this date */}
                <div className="space-y-4">
                  {messages.map((message) => (
                    <MessageItem key={message.id} message={message} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}