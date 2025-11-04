'use client';

/**
 * Collaborative Note Editor Component
 * 
 * Real-time collaborative note editor using TipTap and Yjs for conflict-free editing.
 * Supports public/private notes with encryption for private notes.
 */

import { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import { useYjs } from '@/lib/hooks/use-yjs';
import { Button } from '@/components/ui/button';
import { 
  LockClosedIcon, 
  LockOpenIcon,
  BoldIcon,
  ItalicIcon,
  ListBulletIcon,
} from '@heroicons/react/24/outline';
import { configureMentionExtension, parseMentions } from '@/lib/editor/mention-extension';

interface NoteEditorProps {
  /** Conversation ID for the note */
  conversationId: string;
  /** Current user information */
  user: {
    id: string;
    name: string;
    email?: string;
  };
  /** Whether the note is private (encrypted) */
  isPrivate?: boolean;
  /** Callback when privacy setting changes */
  onPrivacyChange?: (isPrivate: boolean) => void;
  /** Callback when note is saved */
  onSave?: (content: string, isPrivate: boolean, mentions?: string[]) => Promise<void>;
}

export function NoteEditor({
  conversationId,
  user,
  isPrivate = false,
  onPrivacyChange,
  onSave,
}: NoteEditorProps) {
  const [privateMode, setPrivateMode] = useState(isPrivate);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Initialize Yjs for collaborative editing
  // TODO: Fix Yjs WebSocket protocol handling - disabled for now
  const { doc, provider, isConnected, isSynced } = useYjs({
    documentId: `note-${conversationId}`,
    user: {
      id: user.id,
      name: user.name,
    },
    enabled: false, // Temporarily disabled - needs proper y-websocket server
  });

  // Initialize TipTap editor
  const editor = useEditor({
    immediatelyRender: false, // Fix SSR hydration issues
    extensions: [
      StarterKit.configure({
        history: false, // Disable history when using Yjs
      }),
      // Add mention support
      configureMentionExtension(),
      // Only enable collaboration for public notes
      ...(doc && !privateMode
        ? [
            Collaboration.configure({
              document: doc,
            }),
            CollaborationCursor.configure({
              provider: provider!,
              user: {
                name: user.name,
                color: generateUserColor(user.id),
              },
            }),
          ]
        : []),
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-[250px] p-6 text-gray-900',
      },
    },
  });

  // Handle privacy toggle
  const handlePrivacyToggle = () => {
    const newPrivateMode = !privateMode;
    setPrivateMode(newPrivateMode);
    onPrivacyChange?.(newPrivateMode);
  };

  // Handle save
  const handleSave = async () => {
    if (!editor) return;

    setIsSaving(true);
    setSaveStatus('saving');

    try {
      const content = editor.getHTML();
      const mentions = parseMentions(content);
      
      // Pass mentions to the save handler
      await onSave?.(content, privateMode, mentions);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to save note:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  if (!editor) {
    return <div className="p-4 text-gray-500">Loading editor...</div>;
  }

  return (
    <div className="border-2 border-gray-200 rounded-xl bg-white shadow-lg">
      {/* Toolbar */}
      <div className="border-b-2 border-gray-200 p-3 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center gap-2">
          {/* Text formatting buttons */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`hover:bg-blue-100 transition-colors ${
              editor.isActive('bold') ? 'bg-blue-500 text-white hover:bg-blue-600' : 'text-gray-700'
            }`}
            title="Bold (Ctrl+B)"
          >
            <BoldIcon className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`hover:bg-blue-100 transition-colors ${
              editor.isActive('italic') ? 'bg-blue-500 text-white hover:bg-blue-600' : 'text-gray-700'
            }`}
            title="Italic (Ctrl+I)"
          >
            <ItalicIcon className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`hover:bg-blue-100 transition-colors ${
              editor.isActive('bulletList') ? 'bg-blue-500 text-white hover:bg-blue-600' : 'text-gray-700'
            }`}
            title="Bullet List"
          >
            <ListBulletIcon className="h-5 w-5" />
          </Button>

          <div className="w-px h-8 bg-gray-300 mx-2" />

          {/* Privacy toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrivacyToggle}
            className={`font-medium transition-all ${
              privateMode 
                ? 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-300' 
                : 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-300'
            }`}
            title={privateMode ? 'Switch to Public Note' : 'Switch to Private Note'}
          >
            {privateMode ? (
              <LockClosedIcon className="h-5 w-5" />
            ) : (
              <LockOpenIcon className="h-5 w-5" />
            )}
            <span className="ml-2 text-sm font-semibold">
              {privateMode ? 'Private' : 'Public'}
            </span>
          </Button>
        </div>

        <div className="flex items-center gap-3">
          {/* Connection status */}
          {!privateMode && (
            <div className="flex items-center gap-2 text-sm px-3 py-1 rounded-full bg-gray-100">
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  isConnected && isSynced
                    ? 'bg-green-500 animate-pulse'
                    : isConnected
                    ? 'bg-yellow-500'
                    : 'bg-gray-400'
                }`}
              />
              <span className="text-gray-700 font-medium">
                {isConnected && isSynced
                  ? 'Ready'
                  : isConnected
                  ? 'Syncing...'
                  : 'Offline'}
              </span>
            </div>
          )}

          {/* Save button */}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className={`font-semibold px-6 ${
              saveStatus === 'saved' 
                ? 'bg-green-600 hover:bg-green-700' 
                : saveStatus === 'error'
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {saveStatus === 'saving' && '💾 Saving...'}
            {saveStatus === 'saved' && '✓ Saved'}
            {saveStatus === 'error' && '⚠ Error'}
            {saveStatus === 'idle' && '💾 Save Note'}
          </Button>
        </div>
      </div>

      {/* Editor content */}
      <div className="min-h-[250px]">
        <EditorContent editor={editor} className="prose-lg" />
      </div>

      {/* Info message for private notes */}
      {privateMode && (
        <div className="border-t-2 border-red-200 p-4 bg-red-50">
          <div className="flex items-start gap-3">
            <LockClosedIcon className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-900">Private Note</p>
              <p className="text-sm text-red-700 mt-1">
                This note is only visible to you and won't be shared with team members
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Active users indicator for public notes */}
      {!privateMode && provider && (
        <ActiveUsers provider={provider} currentUserId={user.id} />
      )}
    </div>
  );
}

/**
 * Display active users in the collaborative session
 */
function ActiveUsers({ provider, currentUserId }: { provider: any; currentUserId: string }) {
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    const updateUsers = () => {
      const states = Array.from(provider.awareness.getStates().entries());
      const activeUsers = states
        .map((entry: any) => entry[1].user)
        .filter((user: any) => user && user.id !== currentUserId);
      setUsers(activeUsers);
    };

    provider.awareness.on('change', updateUsers);
    updateUsers();

    return () => {
      provider.awareness.off('change', updateUsers);
    };
  }, [provider, currentUserId]);

  if (users.length === 0) return null;

  return (
    <div className="border-t p-2 bg-blue-50 text-xs">
      <div className="flex items-center gap-2">
        <span className="text-gray-600">Currently editing:</span>
        <div className="flex items-center gap-1">
          {users.map((user, index) => (
            <div
              key={index}
              className="flex items-center gap-1 px-2 py-1 rounded-full bg-white border"
              style={{ borderColor: user.color }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: user.color }}
              />
              <span className="text-gray-700">{user.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Generate a consistent color for a user
 */
function generateUserColor(userId: string): string {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788',
  ];
  
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}
