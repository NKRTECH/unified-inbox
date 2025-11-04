# React Query Hooks Documentation

This directory contains custom React Query hooks for the Unified Inbox application, providing optimistic updates, caching, and real-time data synchronization.

## Overview

The React Query setup includes:
- **QueryProvider**: Configured in the root layout with development tools
- **Custom Hooks**: Type-safe hooks for conversations and messages
- **Optimistic Updates**: Immediate UI updates with rollback on errors
- **Cache Management**: Intelligent invalidation and prefetching strategies

## Configuration

### QueryClient Settings

```typescript
// lib/query-client.ts
- staleTime: 5 minutes (default)
- gcTime: 10 minutes (cache retention)
- retry: Smart retry logic (no retry on 4xx errors)
- refetchOnWindowFocus: true (real-time updates)
- refetchOnReconnect: true (network recovery)
```

### Provider Setup

```tsx
// app/layout.tsx
<QueryProvider>
  {children}
</QueryProvider>
```

## Available Hooks

### Conversation Hooks

#### `useConversations(filters?, sort?, page?, limit?)`
Fetch paginated conversations with filtering and sorting.

```tsx
const { data, isLoading, error } = useConversations(
  { status: 'ACTIVE', priority: 'HIGH' },
  { field: 'updatedAt', order: 'desc' },
  1,
  20
);
```

#### `useConversation(id)`
Fetch a single conversation by ID.

```tsx
const { data: conversation } = useConversation(conversationId);
```

#### `useCreateConversation()`
Create a new conversation with cache updates.

```tsx
const createConversation = useCreateConversation();
await createConversation.mutateAsync({
  contactId: 'contact-123',
  status: 'ACTIVE',
  priority: 'NORMAL'
});
```

#### `useUpdateConversation()`
Update conversation with cache synchronization.

```tsx
const updateConversation = useUpdateConversation();
await updateConversation.mutateAsync({
  id: 'conv-123',
  data: { status: 'RESOLVED' }
});
```

#### `useOptimisticConversationUpdate()`
Update conversation with optimistic UI updates and rollback on error.

```tsx
const optimisticUpdate = useOptimisticConversationUpdate();
await optimisticUpdate.mutateAsync({
  id: 'conv-123',
  data: { status: 'RESOLVED' }
});
```

### Message Hooks

#### `useMessages(params?)`
Fetch paginated messages with filtering.

```tsx
const { data } = useMessages({
  conversationId: 'conv-123',
  channel: 'SMS',
  direction: 'INBOUND'
});
```

#### `useInfiniteMessages(params?)`
Fetch messages with infinite scroll pagination.

```tsx
const {
  data,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage
} = useInfiniteMessages({ conversationId: 'conv-123' });
```

#### `useConversationMessages(conversationId)`
Convenience hook for conversation messages with infinite scroll.

```tsx
const { data: messages } = useConversationMessages(conversationId);
```

#### `useSendMessage()`
Send message with optimistic updates and error handling.

```tsx
const sendMessage = useSendMessage();
await sendMessage.mutateAsync({
  conversationId: 'conv-123',
  contactId: 'contact-123',
  channel: 'SMS',
  direction: 'OUTBOUND',
  content: 'Hello!'
});
```

#### `useMessageRealTimeUpdates(conversationId)`
Utility for real-time message updates via WebSocket.

```tsx
const { addMessage, updateMessage } = useMessageRealTimeUpdates(conversationId);

// In WebSocket handler
websocket.onMessage = (data) => {
  if (data.type === 'new_message') {
    addMessage(data.message);
  }
};
```

### Cache Management

#### `useQueryInvalidation()`
Centralized cache invalidation and prefetching.

```tsx
const {
  invalidateConversations,
  invalidateConversationData,
  prefetchConversation,
  clearAllCache
} = useQueryInvalidation();

// Invalidate after external updates
invalidateConversationData(conversationId);

// Prefetch for better UX
prefetchConversation(nextConversationId);
```

## Optimistic Updates

### How It Works

1. **Immediate UI Update**: UI updates instantly with optimistic data
2. **Server Request**: Actual API call happens in background
3. **Success**: Real data replaces optimistic data
4. **Error**: Optimistic data is rolled back, error is shown

### Example: Sending a Message

```tsx
const sendMessage = useSendMessage();

// This will:
// 1. Immediately add message to UI
// 2. Send API request
// 3. Replace with real message on success
// 4. Remove optimistic message on error
await sendMessage.mutateAsync({
  conversationId,
  contactId,
  channel: 'SMS',
  direction: 'OUTBOUND',
  content: 'Hello!'
});
```

## Cache Invalidation Patterns

### Automatic Invalidation

- **Create Message**: Invalidates conversation messages and lists
- **Update Conversation**: Invalidates conversation detail and lists
- **Send Message**: Updates infinite queries optimistically

### Manual Invalidation

```tsx
// After external data changes (WebSocket, webhooks)
const { invalidateConversationData } = useQueryInvalidation();
invalidateConversationData(conversationId);
```

## Error Handling

### Retry Logic

- **4xx Errors**: No retry (client errors)
- **5xx Errors**: Retry up to 3 times with exponential backoff
- **Network Errors**: Retry once for mutations

### Error States

```tsx
const { data, error, isError } = useConversations();

if (isError) {
  return <div>Error: {error.message}</div>;
}
```

## Performance Optimizations

### Stale Time Configuration

```typescript
// Messages: 10 seconds (frequent updates)
staleTime: 10 * 1000

// Conversations: 30 seconds (moderate updates)
staleTime: 30 * 1000

// Details: 1 minute (less frequent updates)
staleTime: 60 * 1000
```

### Prefetching

```tsx
// Prefetch next conversation for smooth navigation
const { prefetchConversation } = useQueryInvalidation();
prefetchConversation(nextConversationId);
```

### Infinite Queries

```tsx
// Efficient message loading with pagination
const { data, fetchNextPage } = useInfiniteMessages({
  conversationId,
  limit: 50 // Optimal page size
});
```

## Real-time Integration

### WebSocket Updates

```tsx
// In WebSocket handler
const { addMessage, updateMessage } = useMessageRealTimeUpdates(conversationId);

websocket.onMessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.type) {
    case 'message_received':
      addMessage(data.message);
      break;
    case 'message_status_updated':
      updateMessage(data.message);
      break;
  }
};
```

### Webhook Integration

```tsx
// In webhook handler
export async function POST(request: Request) {
  const message = await processWebhook(request);
  
  // Trigger real-time updates
  broadcastToClients({
    type: 'message_received',
    message,
    conversationId: message.conversationId
  });
  
  return Response.json({ success: true });
}
```

## Best Practices

1. **Use Optimistic Updates**: For better UX on user actions
2. **Invalidate Strategically**: Only invalidate what's necessary
3. **Prefetch Predictively**: Prefetch data users are likely to need
4. **Handle Errors Gracefully**: Always provide error states and recovery
5. **Configure Stale Times**: Based on data update frequency
6. **Use Infinite Queries**: For large datasets like message lists

## Example Usage

See `components/examples/query-usage-example.tsx` for a complete example demonstrating:
- Fetching conversations with filters
- Infinite scroll for messages
- Optimistic message sending
- Error handling
- Loading states