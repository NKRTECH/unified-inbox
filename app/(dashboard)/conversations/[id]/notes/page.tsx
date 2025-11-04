'use client';

/**
 * Conversation Notes Page
 * 
 * Displays and manages notes for a conversation with collaborative editing.
 */

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { NoteEditor } from '@/components/notes/note-editor';
import { NoteList } from '@/components/notes/note-list';
import { Button } from '@/components/ui/button';
import { PlusIcon } from '@heroicons/react/24/outline';

interface Note {
  id: string;
  content: string;
  isPrivate: boolean;
  authorId: string;
  authorName: string;
  mentions: string[];
  createdAt: string;
  updatedAt: string;
}

export default function ConversationNotesPage() {
  const params = useParams();
  const conversationId = params.id as string;

  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  // Mock user - in real app, get from auth context
  const currentUser = {
    id: 'user-1',
    name: 'John Doe',
    email: 'john@example.com',
  };

  // Fetch notes
  useEffect(() => {
    fetchNotes();
  }, [conversationId]);

  const fetchNotes = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/conversations/${conversationId}/notes`);
      if (response.ok) {
        const data = await response.json();
        setNotes(data);
      }
    } catch (error) {
      console.error('Failed to fetch notes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveNote = async (
    content: string,
    isPrivate: boolean,
    mentions?: string[]
  ) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          isPrivate,
          mentions,
        }),
      });

      if (response.ok) {
        const newNote = await response.json();
        setNotes([newNote, ...notes]);
        setShowEditor(false);
      } else {
        throw new Error('Failed to save note');
      }
    } catch (error) {
      console.error('Failed to save note:', error);
      throw error;
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setNotes(notes.filter((note) => note.id !== noteId));
      } else {
        throw new Error('Failed to delete note');
      }
    } catch (error) {
      console.error('Failed to delete note:', error);
      throw error;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Conversation Notes</h1>
          <p className="text-sm text-gray-600 mt-1">
            Collaborate with your team on this conversation
          </p>
        </div>
        <Button
          onClick={() => setShowEditor(!showEditor)}
          className="flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          {showEditor ? 'Cancel' : 'New Note'}
        </Button>
      </div>

      {/* Note Editor */}
      {showEditor && (
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <h2 className="text-lg font-semibold mb-4">Create New Note</h2>
          <NoteEditor
            conversationId={conversationId}
            user={currentUser}
            onSave={handleSaveNote}
          />
        </div>
      )}

      {/* Notes List */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Loading notes...</div>
        ) : (
          <NoteList
            notes={notes}
            currentUserId={currentUser.id}
            onNoteSelect={(note) => {
              setSelectedNote(note);
              // Could open a modal or navigate to edit view
            }}
            onNoteDelete={handleDeleteNote}
          />
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">
          💡 Collaborative Editing Tips
        </h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Use @ to mention team members and notify them</li>
          <li>• Toggle between public and private notes using the lock icon</li>
          <li>• See who's currently editing in real-time</li>
          <li>• Changes are automatically synced across all users</li>
        </ul>
      </div>
    </div>
  );
}
