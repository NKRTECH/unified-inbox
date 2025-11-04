/**
 * WebSocket Types and Interfaces
 * Defines the structure for real-time communication events
 */

export enum WebSocketEventType {
  // Message events
  MESSAGE_SENT = 'message:sent',
  MESSAGE_RECEIVED = 'message:received',
  MESSAGE_STATUS_UPDATED = 'message:status_updated',
  
  // Conversation events
  CONVERSATION_UPDATED = 'conversation:updated',
  
  // Typing indicators
  TYPING_START = 'typing:start',
  TYPING_STOP = 'typing:stop',
  
  // Presence events
  USER_JOINED = 'user:joined',
  USER_LEFT = 'user:left',
  PRESENCE_UPDATE = 'presence:update',
  PRESENCE_STATE = 'presence:state',
  
  // Connection events
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
}

export interface WebSocketMessage<T = unknown> {
  type: WebSocketEventType;
  payload: T;
  timestamp: string;
  userId?: string;
  conversationId?: string;
}

export interface MessagePayload {
  id: string;
  conversationId: string;
  content: string;
  channel: string;
  direction: 'INBOUND' | 'OUTBOUND';
  status: string;
  senderId?: string;
  createdAt: string;
}

export interface TypingPayload {
  userId: string;
  userName: string;
  conversationId: string;
}

export interface PresencePayload {
  userId: string;
  userName: string;
  userEmail?: string;
  conversationId?: string;
  status?: 'viewing' | 'editing';
}

export interface PresenceStatePayload {
  conversationId: string;
  users: Array<{
    userId: string;
    userName: string;
    userEmail?: string;
    status: 'viewing' | 'editing';
    lastSeen: string;
  }>;
}

export interface ConversationUpdatePayload {
  id: string;
  status?: string;
  priority?: string;
  assignedTo?: string;
  updatedAt: string;
}

export interface WebSocketClient {
  id: string;
  userId: string;
  conversationIds: Set<string>;
  send: (message: WebSocketMessage) => void;
}
