'use client';

import { useState, useRef, useEffect } from 'react';
import { useSendMessage, useAuthStatus } from '@/lib/hooks';
import { Channel } from '@/lib/types/message';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MessageComposerInlineProps {
  conversationId: string;
  contactId: string;
  defaultChannel?: Channel;
  onMessageSent?: () => void;
}

/**
 * MessageComposerInline is an inline message composer for the inbox
 * with channel selection, character count, and optimistic updates
 */
export function MessageComposerInline({
  conversationId,
  contactId,
  defaultChannel = 'SMS',
  onMessageSent,
}: MessageComposerInlineProps) {
  const [content, setContent] = useState('');
  const [channel, setChannel] = useState<Channel>(defaultChannel);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const { user } = useAuthStatus();
  const sendMessage = useSendMessage();

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  // Get character limit based on channel
  const getCharLimit = () => {
    switch (channel) {
      case 'SMS':
        return 1600;
      case 'WHATSAPP':
        return 4096;
      case 'EMAIL':
        return 10000;
      default:
        return 1600;
    }
  };

  // Get channel info
  const getChannelInfo = (ch: Channel) => {
    switch (ch) {
      case 'SMS':
        return { icon: '💬', color: 'bg-green-100 text-green-800 hover:bg-green-200' };
      case 'WHATSAPP':
        return { icon: '📱', color: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' };
      case 'EMAIL':
        return { icon: '✉️', color: 'bg-blue-100 text-blue-800 hover:bg-blue-200' };
      case 'TWITTER':
        return { icon: '🐦', color: 'bg-sky-100 text-sky-800 hover:bg-sky-200' };
      case 'FACEBOOK':
        return { icon: '👥', color: 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200' };
      default:
        return { icon: '💬', color: 'bg-gray-100 text-gray-800 hover:bg-gray-200' };
    }
  };

  const handleSend = async () => {
    if (!content.trim() || sendMessage.isPending) return;

    if (!user) {
      console.error('Cannot send message: User not authenticated');
      alert('Please log in to send messages');
      return;
    }

    try {
      await sendMessage.mutateAsync({
        conversationId,
        contactId,
        channel,
        direction: 'OUTBOUND',
        content: content.trim(),
        status: 'SENT',
        // senderId will be determined from session on the server
      });

      // Clear form on success
      setContent('');
      onMessageSent?.();
    } catch (error) {
      // Error is handled by the mutation
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Ctrl/Cmd + Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const charLimit = getCharLimit();
  const charCount = content.length;
  const isOverLimit = charCount > charLimit;
  const isNearLimit = charCount > charLimit * 0.9;

  // Available channels (can be filtered based on contact capabilities)
  const availableChannels: Channel[] = ['SMS', 'WHATSAPP', 'EMAIL'];

  return (
    <div className="border-t border-gray-200 bg-white">
      <div className="p-4 space-y-3">
        {/* Channel Selector */}
        <div className="flex items-center space-x-2">
          <span className="text-xs font-medium text-gray-700">Send via:</span>
          <div className="flex items-center space-x-1">
            {availableChannels.map((ch) => {
              const info = getChannelInfo(ch);
              return (
                <button
                  key={ch}
                  onClick={() => setChannel(ch)}
                  className={cn(
                    'px-3 py-1 text-xs font-medium rounded-full transition-colors',
                    channel === ch
                      ? info.color.replace('hover:', '')
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  <span className="mr-1">{info.icon}</span>
                  {ch}
                </button>
              );
            })}
          </div>
        </div>

        {/* Message Input */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Type your ${channel} message... (Ctrl+Enter to send)`}
            className={cn(
              'block w-full border rounded-lg shadow-sm placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none transition-colors p-3',
              isOverLimit
                ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                : 'border-gray-300'
            )}
            rows={3}
            maxLength={charLimit + 100} // Allow slight overflow for warning
          />

          {/* Character Count */}
          <div className="absolute bottom-2 right-2 text-xs font-medium">
            <span
              className={cn(
                'px-2 py-1 rounded',
                isOverLimit
                  ? 'bg-red-100 text-red-700'
                  : isNearLimit
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-gray-100 text-gray-600'
              )}
            >
              {charCount}/{charLimit}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {/* Attachment button (placeholder) */}
            <button
              type="button"
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              title="Attach file (coming soon)"
              disabled
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                />
              </svg>
            </button>

            {/* Emoji button (placeholder) */}
            <button
              type="button"
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              title="Add emoji (coming soon)"
              disabled
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </button>

            {/* Keyboard shortcut hint */}
            <span className="text-xs text-gray-500 ml-2">
              Ctrl+Enter to send
            </span>
          </div>

          {/* Send Button */}
          <Button
            onClick={handleSend}
            disabled={!content.trim() || isOverLimit || sendMessage.isPending || !user}
            size="sm"
            className="px-4"
          >
            {sendMessage.isPending ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Sending...
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
                Send
              </>
            )}
          </Button>
        </div>

        {/* Error Message */}
        {sendMessage.error && (
          <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <svg
              className="w-5 h-5 text-red-600 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">Failed to send message</p>
              <p className="text-xs text-red-600">
                {sendMessage.error instanceof Error
                  ? sendMessage.error.message
                  : 'An error occurred'}
              </p>
            </div>
            <button
              onClick={() => sendMessage.reset()}
              className="text-xs text-red-600 hover:text-red-800 font-medium"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Channel-specific hints */}
        {channel === 'SMS' && content.length > 160 && (
          <div className="flex items-start space-x-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
            <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <span>
              This message will be sent as {Math.ceil(content.length / 160)} SMS segments
            </span>
          </div>
        )}
      </div>
    </div>
  );
}