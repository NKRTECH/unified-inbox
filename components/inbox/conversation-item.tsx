'use client';

import { ConversationWithRelations } from '@/lib/types/conversation';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from '@/lib/utils/date-utils';

interface ConversationItemProps {
  conversation: ConversationWithRelations;
  isSelected?: boolean;
  onClick?: () => void;
}

/**
 * ConversationItem displays a single conversation in the list
 * with contact info, last message preview, channel badge, and status indicators
 */
export function ConversationItem({
  conversation,
  isSelected = false,
  onClick,
}: ConversationItemProps) {
  const { contact, status, priority, updatedAt } = conversation;

  // Get channel badge color
  const getChannelBadgeColor = (channel: string) => {
    switch (channel) {
      case 'SMS':
        return 'bg-green-100 text-green-800';
      case 'WHATSAPP':
        return 'bg-emerald-100 text-emerald-800';
      case 'EMAIL':
        return 'bg-blue-100 text-blue-800';
      case 'TWITTER':
        return 'bg-sky-100 text-sky-800';
      case 'FACEBOOK':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get priority indicator
  const getPriorityIndicator = () => {
    switch (priority) {
      case 'URGENT':
        return (
          <div className="w-2 h-2 rounded-full bg-red-500" title="Urgent" />
        );
      case 'HIGH':
        return (
          <div className="w-2 h-2 rounded-full bg-orange-500" title="High Priority" />
        );
      case 'NORMAL':
        return null;
      case 'LOW':
        return (
          <div className="w-2 h-2 rounded-full bg-gray-400" title="Low Priority" />
        );
      default:
        return null;
    }
  };

  // Get status badge
  const getStatusBadge = () => {
    switch (status) {
      case 'ACTIVE':
        return null; // Don't show badge for active conversations
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
            Resolved
          </span>
        );
      case 'ARCHIVED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
            Archived
          </span>
        );
      default:
        return null;
    }
  };

  // Get contact display name
  const contactName = contact.name || contact.phone || contact.email || 'Unknown Contact';

  // Get contact initials for avatar
  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Placeholder for last message (will be populated from actual data)
  const lastMessage = 'Last message preview...';
  const lastMessageChannel = 'SMS'; // This should come from the last message
  const timeAgo = formatDistanceToNow(new Date(updatedAt));

  return (
    <div
      className={cn(
        'p-4 hover:bg-gray-50 cursor-pointer transition-colors',
        isSelected && 'bg-blue-50 hover:bg-blue-50 border-l-4 border-blue-600'
      )}
      onClick={onClick}
    >
      <div className="flex items-start space-x-3">
        {/* Priority Indicator */}
        {getPriorityIndicator() && (
          <div className="flex-shrink-0 pt-2">{getPriorityIndicator()}</div>
        )}

        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-white">
              {getInitials(contactName)}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-gray-900 truncate">
              {contactName}
            </p>
            <div className="flex items-center space-x-1 ml-2">
              {getStatusBadge()}
            </div>
          </div>

          {/* Contact Info */}
          {(contact.phone || contact.email) && (
            <p className="text-xs text-gray-500 truncate mb-1">
              {contact.phone || contact.email}
            </p>
          )}

          {/* Last Message Preview */}
          <p className="text-sm text-gray-600 truncate mb-2">{lastMessage}</p>

          {/* Footer: Channel Badge and Time */}
          <div className="flex items-center justify-between">
            <span
              className={cn(
                'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                getChannelBadgeColor(lastMessageChannel)
              )}
            >
              {lastMessageChannel}
            </span>
            <span className="text-xs text-gray-500">{timeAgo}</span>
          </div>
        </div>

        {/* Unread Indicator (placeholder) */}
        {status === 'ACTIVE' && (
          <div className="flex-shrink-0">
            <div className="w-2 h-2 rounded-full bg-blue-600" />
          </div>
        )}
      </div>
    </div>
  );
}