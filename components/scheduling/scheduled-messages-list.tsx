/**
 * Scheduled Messages List Component
 * Display and manage scheduled messages
 */

'use client';

import { useState } from 'react';
import {
  CalendarIcon,
  ClockIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';

interface ScheduledMessage {
  id: string;
  messageId: string;
  scheduledFor: Date;
  status: 'PENDING' | 'SENT' | 'FAILED' | 'CANCELLED';
  templateId?: string;
  variables?: Record<string, any>;
  createdAt: Date;
  message: {
    id: string;
    conversationId: string;
    contactId: string;
    channel: string;
    content: string;
    contact: {
      id: string;
      name?: string;
      phone?: string;
      email?: string;
    };
  };
}

interface ScheduledMessagesListProps {
  messages: ScheduledMessage[];
  onEdit?: (message: ScheduledMessage) => void;
  onCancel?: (messageId: string) => Promise<void>;
  onRefresh?: () => void;
}

export function ScheduledMessagesList({
  messages,
  onEdit,
  onCancel,
  onRefresh,
}: ScheduledMessagesListProps) {
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const handleCancel = async (messageId: string) => {
    if (!onCancel) return;
    
    if (!confirm('Are you sure you want to cancel this scheduled message?')) {
      return;
    }

    setCancellingId(messageId);
    try {
      await onCancel(messageId);
      onRefresh?.();
    } catch (error) {
      console.error('Failed to cancel message:', error);
      alert('Failed to cancel message. Please try again.');
    } finally {
      setCancellingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
            <ClockIcon className="h-3 w-3" />
            Pending
          </span>
        );
      case 'SENT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
            <CheckCircleIcon className="h-3 w-3" />
            Sent
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
            <XCircleIcon className="h-3 w-3" />
            Failed
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
            <ExclamationCircleIcon className="h-3 w-3" />
            Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  const getChannelBadge = (channel: string) => {
    const colors: Record<string, string> = {
      SMS: 'bg-blue-100 text-blue-700',
      WHATSAPP: 'bg-green-100 text-green-700',
      EMAIL: 'bg-purple-100 text-purple-700',
      TWITTER: 'bg-sky-100 text-sky-700',
      FACEBOOK: 'bg-indigo-100 text-indigo-700',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[channel] || 'bg-gray-100 text-gray-700'}`}>
        {channel}
      </span>
    );
  };

  const formatDateTime = (date: Date) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    // Format time
    const timeStr = d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    // Format date
    const dateStr = d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });

    // Relative time
    let relativeStr = '';
    if (diffMs < 0) {
      relativeStr = 'Past due';
    } else if (diffMins < 60) {
      relativeStr = `in ${diffMins} min${diffMins !== 1 ? 's' : ''}`;
    } else if (diffHours < 24) {
      relativeStr = `in ${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
    } else if (diffDays < 7) {
      relativeStr = `in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    }

    return { dateStr, timeStr, relativeStr };
  };

  if (messages.length === 0) {
    return (
      <div className="text-center py-12">
        <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No scheduled messages</h3>
        <p className="mt-1 text-sm text-gray-500">
          Schedule messages to send them at a specific time.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {messages.map((scheduledMessage) => {
        const { dateStr, timeStr, relativeStr } = formatDateTime(scheduledMessage.scheduledFor);
        const isPending = scheduledMessage.status === 'PENDING';
        const isCancelling = cancellingId === scheduledMessage.id;

        return (
          <div
            key={scheduledMessage.id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                {/* Header */}
                <div className="flex items-center gap-2 mb-2">
                  {getStatusBadge(scheduledMessage.status)}
                  {getChannelBadge(scheduledMessage.message.channel)}
                  <span className="text-sm font-medium text-gray-900">
                    {scheduledMessage.message.contact.name || 
                     scheduledMessage.message.contact.phone || 
                     scheduledMessage.message.contact.email}
                  </span>
                </div>

                {/* Content Preview */}
                <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                  {scheduledMessage.message.content}
                </p>

                {/* Schedule Info */}
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <CalendarIcon className="h-4 w-4" />
                    <span>{dateStr}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <ClockIcon className="h-4 w-4" />
                    <span>{timeStr}</span>
                  </div>
                  {relativeStr && isPending && (
                    <span className="font-medium text-purple-600">
                      {relativeStr}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              {isPending && (
                <div className="flex items-center gap-2">
                  {onEdit && (
                    <button
                      onClick={() => onEdit(scheduledMessage)}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                  )}
                  {onCancel && (
                    <button
                      onClick={() => handleCancel(scheduledMessage.id)}
                      disabled={isCancelling}
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Cancel"
                    >
                      {isCancelling ? (
                        <div className="animate-spin h-5 w-5 border-2 border-gray-300 border-t-red-600 rounded-full" />
                      ) : (
                        <TrashIcon className="h-5 w-5" />
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
