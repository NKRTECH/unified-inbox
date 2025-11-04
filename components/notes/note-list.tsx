'use client';

/**
 * Note List Component
 * 
 * Displays a list of notes for a conversation with filtering by public/private.
 */

import { useState } from 'react';
import { LockClosedIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';

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

interface NoteListProps {
  /** List of notes to display */
  notes: Note[];
  /** Current user ID */
  currentUserId: string;
  /** Callback when a note is selected for editing */
  onNoteSelect?: (note: Note) => void;
  /** Callback when a note is deleted */
  onNoteDelete?: (noteId: string) => Promise<void>;
}

export function NoteList({
  notes,
  currentUserId,
  onNoteSelect,
  onNoteDelete,
}: NoteListProps) {
  const [filter, setFilter] = useState<'all' | 'public' | 'private'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filter notes based on selected filter
  const filteredNotes = notes.filter((note) => {
    if (filter === 'public') return !note.isPrivate;
    if (filter === 'private') return note.isPrivate;
    return true;
  });

  const handleDelete = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    setDeletingId(noteId);
    try {
      await onNoteDelete?.(noteId);
    } catch (error) {
      console.error('Failed to delete note:', error);
      alert('Failed to delete note');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filter tabs */}
      <div className="flex items-center gap-3 border-b-2 border-gray-200 bg-gray-50 rounded-t-lg p-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-6 py-3 text-sm font-semibold rounded-lg border-2 transition-all ${
            filter === 'all'
              ? 'bg-blue-600 text-white border-blue-600 shadow-md'
              : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:text-blue-600'
          }`}
        >
          📋 All Notes ({notes.length})
        </button>
        <button
          onClick={() => setFilter('public')}
          className={`px-6 py-3 text-sm font-semibold rounded-lg border-2 transition-all ${
            filter === 'public'
              ? 'bg-green-600 text-white border-green-600 shadow-md'
              : 'bg-white text-gray-700 border-gray-300 hover:border-green-400 hover:text-green-600'
          }`}
        >
          🌐 Public ({notes.filter((n) => !n.isPrivate).length})
        </button>
        <button
          onClick={() => setFilter('private')}
          className={`px-6 py-3 text-sm font-semibold rounded-lg border-2 transition-all ${
            filter === 'private'
              ? 'bg-red-600 text-white border-red-600 shadow-md'
              : 'bg-white text-gray-700 border-gray-300 hover:border-red-400 hover:text-red-600'
          }`}
        >
          🔒 Private ({notes.filter((n) => n.isPrivate).length})
        </button>
      </div>

      {/* Notes list */}
      <div className="space-y-4">
        {filteredNotes.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <p className="text-lg font-semibold text-gray-600">No notes found</p>
            <p className="text-sm text-gray-500 mt-2">Create your first note to get started</p>
          </div>
        ) : (
          filteredNotes.map((note) => (
            <NoteItem
              key={note.id}
              note={note}
              currentUserId={currentUserId}
              onSelect={() => onNoteSelect?.(note)}
              onDelete={() => handleDelete(note.id)}
              isDeleting={deletingId === note.id}
            />
          ))
        )}
      </div>
    </div>
  );
}

/**
 * Individual note item component
 */
function NoteItem({
  note,
  currentUserId,
  onSelect,
  onDelete,
  isDeleting,
}: {
  note: Note;
  currentUserId: string;
  onSelect: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const isOwnNote = note.authorId === currentUserId;
  const formattedDate = new Date(note.createdAt).toLocaleString();

  return (
    <div
      className={`border-2 rounded-xl p-5 hover:shadow-xl transition-all cursor-pointer transform hover:-translate-y-1 ${
        note.isPrivate 
          ? 'bg-gradient-to-br from-red-50 to-pink-50 border-red-300 hover:border-red-400' 
          : 'bg-white border-gray-200 hover:border-blue-400'
      }`}
      onClick={onSelect}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 rounded-full p-2">
            <UserCircleIcon className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <div className="text-base font-bold text-gray-900">
              {note.authorName}
              {isOwnNote && (
                <span className="ml-2 text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                  You
                </span>
              )}
            </div>
            <div className="text-sm text-gray-600 font-medium">{formattedDate}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {note.isPrivate && (
            <div className="flex items-center gap-2 text-sm font-semibold text-red-700 bg-red-100 px-3 py-1.5 rounded-full border border-red-300">
              <LockClosedIcon className="h-4 w-4" />
              <span>Private</span>
            </div>
          )}
          {isOwnNote && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              disabled={isDeleting}
              className="text-red-600 hover:text-white hover:bg-red-600 font-semibold border-2 border-red-300 hover:border-red-600"
            >
              {isDeleting ? '🗑️ Deleting...' : '🗑️ Delete'}
            </Button>
          )}
        </div>
      </div>

      {/* Content preview */}
      <div
        className="text-base text-gray-800 line-clamp-3 prose prose-base leading-relaxed"
        dangerouslySetInnerHTML={{ __html: note.content }}
      />

      {/* Mentions */}
      {note.mentions.length > 0 && (
        <div className="mt-4 flex items-center gap-2 flex-wrap pt-3 border-t border-gray-200">
          <span className="text-sm font-semibold text-gray-700">👥 Mentions:</span>
          {note.mentions.map((mention, index) => (
            <span
              key={index}
              className="text-sm font-semibold bg-blue-500 text-white px-3 py-1 rounded-full shadow-sm"
            >
              @{mention}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
