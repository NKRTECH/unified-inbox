'use client';

/**
 * Mention Autocomplete Component
 * 
 * Provides autocomplete suggestions for @mentions in the note editor.
 */

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { UserCircleIcon } from '@heroicons/react/24/outline';

export interface MentionUser {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
}

export interface MentionListProps {
  items: MentionUser[];
  command: (item: MentionUser) => void;
}

export interface MentionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

/**
 * Mention list component for autocomplete dropdown
 */
export const MentionList = forwardRef<MentionListRef, MentionListProps>(
  (props, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const selectItem = (index: number) => {
      const item = props.items[index];
      if (item) {
        props.command(item);
      }
    };

    const upHandler = () => {
      setSelectedIndex(
        (selectedIndex + props.items.length - 1) % props.items.length
      );
    };

    const downHandler = () => {
      setSelectedIndex((selectedIndex + 1) % props.items.length);
    };

    const enterHandler = () => {
      selectItem(selectedIndex);
    };

    useEffect(() => {
      setSelectedIndex(0);
    }, [props.items]);

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === 'ArrowUp') {
          upHandler();
          return true;
        }

        if (event.key === 'ArrowDown') {
          downHandler();
          return true;
        }

        if (event.key === 'Enter') {
          enterHandler();
          return true;
        }

        return false;
      },
    }));

    if (props.items.length === 0) {
      return (
        <div className="bg-white border rounded-lg shadow-lg p-2 text-sm text-gray-500">
          No users found
        </div>
      );
    }

    return (
      <div className="bg-white border rounded-lg shadow-lg overflow-hidden max-h-60 overflow-y-auto">
        {props.items.map((item, index) => (
          <button
            key={item.id}
            onClick={() => selectItem(index)}
            className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-100 transition-colors ${
              index === selectedIndex ? 'bg-blue-50' : ''
            }`}
          >
            {item.avatar ? (
              <img
                src={item.avatar}
                alt={item.name}
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <UserCircleIcon className="w-8 h-8 text-gray-400" />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                {item.name}
              </div>
              {item.email && (
                <div className="text-xs text-gray-500 truncate">
                  {item.email}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    );
  }
);

MentionList.displayName = 'MentionList';
