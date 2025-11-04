'use client';

import { useConversations, useSendMessage, useConversationMessages } from '@/lib/hooks';
import { Button } from '@/components/ui/button';

/**
 * Example component demonstrating React Query usage with optimistic updates
 * This is for documentation purposes and shows how to use the custom hooks
 */
export function QueryUsageExample() {
  // Fetch conversations with filters
  const { data: conversations, isLoading, error } = useConversations(
    { status: 'ACTIVE' }, // filters
    { field: 'updatedAt', order: 'desc' }, // sort
    1, // page
    20 // limit
  );

  // Fetch messages for a specific conversation with infinite scroll
  const conversationId = conversations?.conversations[0]?.id;
  const {
    data: messagesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useConversationMessages(conversationId || '');

  // Send message with optimistic updates
  const sendMessage = useSendMessage();

  const handleSendMessage = async () => {
    if (!conversationId) return;

    try {
      await sendMessage.mutateAsync({
        conversationId,
        contactId: conversations?.conversations[0]?.contactId || '',
        channel: 'SMS',
        direction: 'OUTBOUND',
        content: 'Hello from React Query!',
        status: 'SENT',
        senderId: 'user-id-placeholder', // Replace with actual user ID
      });
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  if (isLoading) return <div>Loading conversations...</div>;
  if (error) return <div>Error loading conversations</div>;

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-semibold">React Query Example</h2>
      
      {/* Conversations List */}
      <div>
        <h3 className="text-lg font-medium">Active Conversations ({conversations?.conversations.length})</h3>
        <div className="space-y-2">
          {conversations?.conversations.map((conversation) => (
            <div key={conversation.id} className="p-2 border rounded">
              <p>Contact: {conversation.contact.name || conversation.contact.phone}</p>
              <p>Status: {conversation.status}</p>
              <p>Priority: {conversation.priority}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Messages for First Conversation */}
      {conversationId && (
        <div>
          <h3 className="text-lg font-medium">Messages</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {messagesData?.pages.map((page, i) => (
              <div key={i}>
                {page.messages.map((message) => (
                  <div key={message.id} className="p-2 border rounded">
                    <p className="text-sm text-gray-600">
                      {message.direction} • {message.channel} • {message.status}
                    </p>
                    <p>{message.content}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
          
          {hasNextPage && (
            <Button 
              onClick={() => fetchNextPage()} 
              disabled={isFetchingNextPage}
              variant="outline"
              className="mt-2"
            >
              {isFetchingNextPage ? 'Loading...' : 'Load More Messages'}
            </Button>
          )}
        </div>
      )}

      {/* Send Message Button */}
      <Button 
        onClick={handleSendMessage}
        disabled={sendMessage.isPending || !conversationId}
        className="w-full"
      >
        {sendMessage.isPending ? 'Sending...' : 'Send Test Message'}
      </Button>

      {sendMessage.error && (
        <div className="text-red-600 text-sm">
          Error: {sendMessage.error.message}
        </div>
      )}
    </div>
  );
}