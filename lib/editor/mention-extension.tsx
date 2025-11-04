/**
 * TipTap Mention Extension Configuration
 * 
 * Configures the @mention functionality for the collaborative note editor.
 */

import { ReactRenderer } from '@tiptap/react';
import Mention from '@tiptap/extension-mention';
import tippy, { Instance as TippyInstance } from 'tippy.js';
import {
  MentionList,
  MentionListRef,
  type MentionUser,
} from '@/components/notes/mention-autocomplete';

/**
 * Search users for mention suggestions
 */
async function searchUsers(query: string): Promise<MentionUser[]> {
  try {
    const response = await fetch(
      `/api/users/search?q=${encodeURIComponent(query)}`
    );
    if (!response.ok) {
      throw new Error('Failed to search users');
    }
    return await response.json();
  } catch (error) {
    console.error('Error searching users:', error);
    return [];
  }
}

/**
 * Configure the Mention extension for TipTap
 */
export function configureMentionExtension() {
  return Mention.configure({
    HTMLAttributes: {
      class: 'mention',
    },
    suggestion: {
      items: async ({ query }: { query: string }) => {
        if (!query) {
          return [];
        }
        return await searchUsers(query);
      },

      render: () => {
        let component: ReactRenderer<MentionListRef> | undefined;
        let popup: TippyInstance[] | undefined;

        return {
          onStart: (props: any) => {
            component = new ReactRenderer(MentionList, {
              props,
              editor: props.editor,
            });

            if (!props.clientRect) {
              return;
            }

            popup = tippy('body', {
              getReferenceClientRect: props.clientRect,
              appendTo: () => document.body,
              content: component.element,
              showOnCreate: true,
              interactive: true,
              trigger: 'manual',
              placement: 'bottom-start',
            });
          },

          onUpdate(props: any) {
            component?.updateProps(props);

            if (!props.clientRect) {
              return;
            }

            popup?.[0]?.setProps({
              getReferenceClientRect: props.clientRect,
            });
          },

          onKeyDown(props: any) {
            if (props.event.key === 'Escape') {
              popup?.[0]?.hide();
              return true;
            }

            return component?.ref?.onKeyDown(props) ?? false;
          },

          onExit() {
            popup?.[0]?.destroy();
            component?.destroy();
          },
        };
      },
    },
  });
}

/**
 * Parse mentions from HTML content
 */
export function parseMentions(htmlContent: string): string[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  const mentionElements = doc.querySelectorAll('[data-type="mention"]');
  
  const mentions: string[] = [];
  mentionElements.forEach((element) => {
    const userId = element.getAttribute('data-id');
    if (userId) {
      mentions.push(userId);
    }
  });

  return mentions;
}
