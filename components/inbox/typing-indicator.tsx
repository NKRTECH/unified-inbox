/**
 * TypingIndicator Component
 * Displays typing indicators for active users in a conversation
 */

'use client';

import React from 'react';

interface TypingIndicatorProps {
  typingText: string | null;
  className?: string;
}

export function TypingIndicator({ typingText, className = '' }: TypingIndicatorProps) {
  if (!typingText) return null;

  return (
    <div className={`flex items-center gap-2 text-sm text-muted-foreground ${className}`}>
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
        <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
        <span className="w-2 h-2 bg-primary rounded-full animate-bounce" />
      </div>
      <span>{typingText}</span>
    </div>
  );
}
