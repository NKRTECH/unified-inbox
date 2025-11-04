'use client';

import { useState } from 'react';
import { 
  ConversationList, 
  MessageThread, 
  MessageThreadHeader,
  MessageComposerInline 
} from '@/components/inbox';
import { useConversation } from '@/lib/hooks';

export default function InboxPage() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | undefined>();
  const { data: selectedConversation } = useConversation(selectedConversationId || '');

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Inbox</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage conversations across all channels
        </p>
      </div>

      {/* Main inbox content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
        {/* Conversation list */}
        <div className="lg:col-span-1">
          <ConversationList
            selectedConversationId={selectedConversationId}
            onSelectConversation={setSelectedConversationId}
          />
        </div>

        {/* Message thread */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow border border-gray-200 flex flex-col">
          {selectedConversationId && selectedConversation ? (
            <>
              {/* Thread header */}
              <MessageThreadHeader conversationId={selectedConversationId} />

              {/* Messages */}
              <MessageThread conversationId={selectedConversationId} />

              {/* Message composer */}
              <MessageComposerInline
                conversationId={selectedConversationId}
                contactId={selectedConversation.contactId}
              />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <div className="text-gray-400 mb-4">
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
                No conversation selected
              </h3>
              <p className="text-sm text-gray-500">
                Select a conversation from the list to view messages
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
