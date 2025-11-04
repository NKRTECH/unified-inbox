'use client';

import { MessageResponse } from '@/lib/types/message';
import { cn } from '@/lib/utils';
import { formatTime } from '@/lib/utils/date-utils';

interface MessageItemProps {
  message: MessageResponse;
}

/**
 * MessageItem displays a single message with channel indicator,
 * timestamp, direction, and status
 */
export function MessageItem({ message }: MessageItemProps) {
  const isOutbound = message.direction === 'OUTBOUND';

  // Get channel icon and color
  const getChannelInfo = () => {
    switch (message.channel) {
      case 'SMS':
        return {
          icon: '💬',
          color: 'text-green-600',
          bg: 'bg-green-50',
        };
      case 'WHATSAPP':
        return {
          icon: '📱',
          color: 'text-emerald-600',
          bg: 'bg-emerald-50',
        };
      case 'EMAIL':
        return {
          icon: '✉️',
          color: 'text-blue-600',
          bg: 'bg-blue-50',
        };
      case 'TWITTER':
        return {
          icon: '🐦',
          color: 'text-sky-600',
          bg: 'bg-sky-50',
        };
      case 'FACEBOOK':
        return {
          icon: '👥',
          color: 'text-indigo-600',
          bg: 'bg-indigo-50',
        };
      default:
        return {
          icon: '💬',
          color: 'text-gray-600',
          bg: 'bg-gray-50',
        };
    }
  };

  // Get status icon
  const getStatusIcon = () => {
    switch (message.status) {
      case 'SENT':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'DELIVERED':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
            <path
              fillRule="evenodd"
              d="M19.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'READ':
        return (
          <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
            <path
              fillRule="evenodd"
              d="M19.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'FAILED':
        return (
          <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'SCHEDULED':
        return (
          <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
              clipRule="evenodd"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  const channelInfo = getChannelInfo();
  const timestamp = formatTime(new Date(message.createdAt));

  return (
    <div className={cn('flex', isOutbound ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-xs lg:max-w-md',
          isOutbound ? 'order-2' : 'order-1'
        )}
      >
        {/* Message Bubble */}
        <div
          className={cn(
            'px-4 py-2 rounded-lg shadow-sm',
            isOutbound
              ? 'bg-blue-600 text-white rounded-br-none'
              : 'bg-gray-100 text-gray-900 rounded-bl-none'
          )}
        >
          {/* Channel Badge (for inbound messages) */}
          {!isOutbound && (
            <div className="flex items-center space-x-1 mb-1">
              <span className="text-xs">{channelInfo.icon}</span>
              <span className={cn('text-xs font-medium', channelInfo.color)}>
                {message.channel}
              </span>
            </div>
          )}

          {/* Message Content */}
          <p className="text-sm whitespace-pre-wrap break-words">
            {message.content}
          </p>

          {/* Attachments */}
          {message.attachments && Array.isArray(message.attachments) && message.attachments.length > 0 && (
            <div className="mt-2 space-y-1">
              {message.attachments.map((attachment, index) => (
                <a
                  key={index}
                  href={attachment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'flex items-center space-x-2 text-xs p-2 rounded',
                    isOutbound
                      ? 'bg-blue-700 hover:bg-blue-800'
                      : 'bg-gray-200 hover:bg-gray-300'
                  )}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="truncate">{attachment.name}</span>
                </a>
              ))}
            </div>
          )}

          {/* Timestamp and Status */}
          <div
            className={cn(
              'flex items-center justify-between mt-1 text-xs',
              isOutbound ? 'text-blue-100' : 'text-gray-500'
            )}
          >
            <span>{timestamp}</span>
            {isOutbound && (
              <div className="flex items-center space-x-1">
                <span className="capitalize text-xs">{message.status.toLowerCase()}</span>
                {getStatusIcon()}
              </div>
            )}
          </div>
        </div>

        {/* Sender Info (for outbound messages) */}
        {isOutbound && message.sender && (
          <div className="flex items-center justify-end space-x-1 mt-1 text-xs text-gray-500">
            <span>{message.sender.name || message.sender.email}</span>
            <span>•</span>
            <span className={cn('font-medium', channelInfo.color)}>
              {message.channel}
            </span>
          </div>
        )}

        {/* Error Message */}
        {message.status === 'FAILED' && (
          <div className="mt-1 text-xs text-red-600 flex items-center space-x-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span>Failed to send. Click to retry.</span>
          </div>
        )}
      </div>
    </div>
  );
}