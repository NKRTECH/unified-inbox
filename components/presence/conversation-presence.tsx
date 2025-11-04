/**
 * Conversation Presence Component
 * Shows active users currently viewing or editing a conversation
 */

'use client';

import { usePresence, PresenceUser } from '@/lib/hooks/use-presence';
import { WebSocketClient } from '@/lib/websocket/client';
import { UserCircleIcon, PencilIcon, EyeIcon } from '@heroicons/react/24/solid';

interface ConversationPresenceProps {
  conversationId: string;
  userId: string;
  userName: string;
  userEmail?: string;
  wsClient?: WebSocketClient | null;
  maxDisplay?: number;
  showText?: boolean;
}

/**
 * Display active users in a conversation with status indicators
 */
export function ConversationPresence({
  conversationId,
  userId,
  userName,
  userEmail,
  wsClient,
  maxDisplay = 5,
  showText = true,
}: ConversationPresenceProps) {
  const { activeUsers, editingUsers, viewingUsers, presenceText, hasActiveUsers } = usePresence({
    conversationId,
    userId,
    userName,
    userEmail,
    wsClient,
  });

  if (!hasActiveUsers) {
    return null;
  }

  const displayUsers = activeUsers.slice(0, maxDisplay);
  const remainingCount = activeUsers.length - maxDisplay;

  return (
    <div className="flex items-center gap-3">
      {/* User Avatars */}
      <div className="flex items-center -space-x-2">
        {displayUsers.map((user) => (
          <UserAvatar key={user.userId} user={user} />
        ))}
        {remainingCount > 0 && (
          <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-300 flex items-center justify-center text-gray-700 text-xs font-medium shadow-sm z-10">
            +{remainingCount}
          </div>
        )}
      </div>

      {/* Presence Text */}
      {showText && presenceText && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            {editingUsers.length > 0 && (
              <PencilIcon className="w-4 h-4 text-blue-500" />
            )}
            {editingUsers.length === 0 && viewingUsers.length > 0 && (
              <EyeIcon className="w-4 h-4 text-gray-400" />
            )}
          </div>
          <span>{presenceText}</span>
        </div>
      )}
    </div>
  );
}

/**
 * User avatar with status indicator
 */
function UserAvatar({ user }: { user: PresenceUser }) {
  const isEditing = user.status === 'editing';
  const bgColor = isEditing ? 'bg-blue-500' : 'bg-gray-400';
  const borderColor = isEditing ? 'border-blue-200' : 'border-gray-200';

  return (
    <div className="relative group z-10">
      <div
        className={`w-8 h-8 rounded-full border-2 ${borderColor} ${bgColor} flex items-center justify-center text-white text-xs font-medium shadow-sm transition-transform hover:scale-110`}
      >
        {user.userName.charAt(0).toUpperCase()}
      </div>

      {/* Status Indicator */}
      {isEditing && (
        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-blue-500 border-2 border-white rounded-full">
          <PencilIcon className="w-2 h-2 text-white absolute top-0 left-0" />
        </div>
      )}

      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
        <div className="font-medium">{user.userName}</div>
        {user.userEmail && <div className="text-gray-300">{user.userEmail}</div>}
        <div className="text-gray-400 capitalize">{user.status}</div>
      </div>
    </div>
  );
}

/**
 * Compact presence indicator (just count)
 */
export function CompactPresence({
  conversationId,
  userId,
  userName,
  userEmail,
  wsClient,
}: Omit<ConversationPresenceProps, 'maxDisplay' | 'showText'>) {
  const { activeUsers, hasActiveUsers } = usePresence({
    conversationId,
    userId,
    userName,
    userEmail,
    wsClient,
  });

  if (!hasActiveUsers) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 text-xs text-gray-500">
      <UserCircleIcon className="w-4 h-4" />
      <span>{activeUsers.length}</span>
    </div>
  );
}

/**
 * Editing indicator banner
 */
export function EditingBanner({
  conversationId,
  userId,
  userName,
  userEmail,
  wsClient,
}: Omit<ConversationPresenceProps, 'maxDisplay' | 'showText'>) {
  const { editingUsers } = usePresence({
    conversationId,
    userId,
    userName,
    userEmail,
    wsClient,
  });

  if (editingUsers.length === 0) {
    return null;
  }

  const text =
    editingUsers.length === 1
      ? `${editingUsers[0].userName} is currently editing`
      : editingUsers.length === 2
      ? `${editingUsers[0].userName} and ${editingUsers[1].userName} are currently editing`
      : `${editingUsers[0].userName} and ${editingUsers.length - 1} others are currently editing`;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 flex items-center gap-2">
      <PencilIcon className="w-4 h-4 text-blue-600" />
      <span className="text-sm text-blue-800">{text}</span>
    </div>
  );
}
