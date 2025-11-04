'use client';

/**
 * Presence Indicator Component
 * 
 * Shows active users currently viewing or editing a conversation/note.
 */

import { useEffect, useState } from 'react';
import { UserCircleIcon } from '@heroicons/react/24/solid';

interface User {
  id: string;
  name: string;
  color: string;
}

interface PresenceIndicatorProps {
  /** Yjs provider for awareness */
  provider: any;
  /** Current user ID to exclude from display */
  currentUserId: string;
  /** Maximum number of avatars to show before "+N" */
  maxDisplay?: number;
}

export function PresenceIndicator({
  provider,
  currentUserId,
  maxDisplay = 5,
}: PresenceIndicatorProps) {
  const [activeUsers, setActiveUsers] = useState<User[]>([]);

  useEffect(() => {
    if (!provider) return;

    const updatePresence = () => {
      const states = Array.from(provider.awareness.getStates().entries());
      const users = states
        .map((entry: any) => entry[1].user)
        .filter((user: any) => user && user.id !== currentUserId) as User[];
      
      setActiveUsers(users);
    };

    provider.awareness.on('change', updatePresence);
    updatePresence();

    return () => {
      provider.awareness.off('change', updatePresence);
    };
  }, [provider, currentUserId]);

  if (activeUsers.length === 0) {
    return null;
  }

  const displayUsers = activeUsers.slice(0, maxDisplay);
  const remainingCount = activeUsers.length - maxDisplay;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-600">Active:</span>
      <div className="flex items-center -space-x-2">
        {displayUsers.map((user, index) => (
          <div
            key={`${user.id}-${index}`}
            className="relative group"
            title={user.name}
          >
            <div
              className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-medium shadow-sm"
              style={{ backgroundColor: user.color }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              {user.name}
            </div>
          </div>
        ))}
        {remainingCount > 0 && (
          <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-300 flex items-center justify-center text-gray-700 text-xs font-medium shadow-sm">
            +{remainingCount}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Simple typing indicator for showing when someone is typing
 */
export function TypingIndicator({ typingUsers }: { typingUsers: string[] }) {
  if (typingUsers.length === 0) return null;

  const text =
    typingUsers.length === 1
      ? `${typingUsers[0]} is typing...`
      : typingUsers.length === 2
      ? `${typingUsers[0]} and ${typingUsers[1]} are typing...`
      : `${typingUsers[0]} and ${typingUsers.length - 1} others are typing...`;

  return (
    <div className="flex items-center gap-2 text-xs text-gray-500 italic">
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span>{text}</span>
    </div>
  );
}
