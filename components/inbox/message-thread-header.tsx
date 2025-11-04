'use client';

import { useConversation } from '@/lib/hooks';
import { cn } from '@/lib/utils';

interface MessageThreadHeaderProps {
  conversationId: string;
}

/**
 * MessageThreadHeader displays conversation details and actions
 */
export function MessageThreadHeader({ conversationId }: MessageThreadHeaderProps) {
  const { data: conversation, isLoading } = useConversation(conversationId);

  if (isLoading) {
    return (
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse" />
            <div className="space-y-2">
              <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="h-6 w-16 bg-gray-200 rounded-full animate-pulse" />
            <div className="h-6 w-16 bg-gray-200 rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return null;
  }

  const { contact, status, priority, assignedUser } = conversation;

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

  // Get status badge
  const getStatusBadge = () => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Active
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Resolved
          </span>
        );
      case 'ARCHIVED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            Archived
          </span>
        );
      default:
        return null;
    }
  };

  // Get priority badge
  const getPriorityBadge = () => {
    switch (priority) {
      case 'URGENT':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            🔴 Urgent
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            🟠 High
          </span>
        );
      case 'NORMAL':
        return null; // Don't show badge for normal priority
      case 'LOW':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            Low
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-4 border-b border-gray-200 bg-white">
      <div className="flex items-center justify-between">
        {/* Contact Info */}
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-medium text-white">
              {getInitials(contactName)}
            </span>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">{contactName}</h3>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              {contact.phone && <span>{contact.phone}</span>}
              {contact.phone && contact.email && <span>•</span>}
              {contact.email && <span>{contact.email}</span>}
            </div>
          </div>
        </div>

        {/* Status and Priority Badges */}
        <div className="flex items-center space-x-2">
          {getPriorityBadge()}
          {getStatusBadge()}
          {assignedUser && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              👤 {assignedUser.name || assignedUser.email}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}