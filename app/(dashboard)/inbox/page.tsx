'use client';

import { useState, useEffect } from 'react';
import { 
  ConversationList, 
  MessageThread, 
  MessageThreadHeader,
  MessageComposerInline 
} from '@/components/inbox';
import { useConversation, useWebSocket, useAuthStatus } from '@/lib/hooks';
import { NoteEditor } from '@/components/notes/note-editor';
import { NoteList } from '@/components/notes/note-list';
import { ChatBubbleLeftIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

type TabType = 'messages' | 'notes';

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

export default function InboxPage() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState<TabType>('messages');
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  
  const { data: selectedConversation } = useConversation(selectedConversationId || '');
  const { user } = useAuthStatus();
  
  // WebSocket real-time updates - ENABLED
  const { isConnected } = useWebSocket({
    userId: user?.id || '',
    enabled: !!user?.id,
  });

  // Fetch notes when conversation changes or notes tab is selected
  useEffect(() => {
    if (selectedConversationId && activeTab === 'notes') {
      fetchNotes();
    }
  }, [selectedConversationId, activeTab]);

  const fetchNotes = async () => {
    if (!selectedConversationId) return;
    
    try {
      setIsLoadingNotes(true);
      const response = await fetch(`/api/conversations/${selectedConversationId}/notes`);
      if (response.ok) {
        const data = await response.json();
        setNotes(data);
      }
    } catch (error) {
      console.error('Failed to fetch notes:', error);
    } finally {
      setIsLoadingNotes(false);
    }
  };

  const handleSaveNote = async (
    content: string,
    isPrivate: boolean,
    mentions?: string[]
  ) => {
    if (!selectedConversationId || !user) return;

    try {
      const response = await fetch(`/api/conversations/${selectedConversationId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          isPrivate,
          mentions,
          userId: user.id, // Send the actual user ID
        }),
      });

      if (response.ok) {
        const newNote = await response.json();
        setNotes([newNote, ...notes]);
        setShowNoteEditor(false);
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
    <div className="space-y-6">
      {/* Page header */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inbox</h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage conversations across all channels
            </p>
          </div>
          {/* Connection status indicator */}
          {user && (
            <div className="flex items-center gap-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className={isConnected ? 'text-green-600' : 'text-gray-500'}>
                {isConnected ? 'Live' : 'Connecting...'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main inbox content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
        {/* Conversation list */}
        <div className="lg:col-span-1">
          <ConversationList
            selectedConversationId={selectedConversationId}
            onSelectConversation={setSelectedConversationId}
          />
        </div>

        {/* Message thread / Notes panel */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow border border-gray-200 flex flex-col">
          {selectedConversationId && selectedConversation ? (
            <>
              {/* Thread header with tabs */}
              <div className="border-b border-gray-200">
                <MessageThreadHeader conversationId={selectedConversationId} />
                
                {/* Tab navigation */}
                <div className="flex border-t border-gray-200">
                  <button
                    onClick={() => setActiveTab('messages')}
                    className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'messages'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                    }`}
                  >
                    <ChatBubbleLeftIcon className="h-5 w-5" />
                    Messages
                  </button>
                  <button
                    onClick={() => setActiveTab('notes')}
                    className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'notes'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                    }`}
                  >
                    <DocumentTextIcon className="h-5 w-5" />
                    Notes
                    {notes.length > 0 && (
                      <span className="ml-1 px-2 py-0.5 text-xs bg-gray-200 text-gray-700 rounded-full">
                        {notes.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Tab content */}
              {activeTab === 'messages' ? (
                <>
                  {/* Messages */}
                  <MessageThread 
                    conversationId={selectedConversationId}
                    userId={user?.id || ''}
                  />

                  {/* Message composer */}
                  <MessageComposerInline
                    conversationId={selectedConversationId}
                    contactId={selectedConversation.contactId}
                  />
                </>
              ) : (
                <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-gray-50 to-white">
                  {/* Notes header */}
                  <div className="flex items-center justify-between mb-8 bg-white p-6 rounded-xl shadow-md border-2 border-gray-200">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        📝 Collaborative Notes
                      </h2>
                      <p className="text-base text-gray-600 mt-2 font-medium">
                        Work together with your team on this conversation
                      </p>
                    </div>
                    <button
                      onClick={() => setShowNoteEditor(!showNoteEditor)}
                      className={`px-6 py-3 text-base font-bold rounded-xl transition-all shadow-lg transform hover:scale-105 ${
                        showNoteEditor
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white'
                      }`}
                    >
                      {showNoteEditor ? '✕ Cancel' : '+ New Note'}
                    </button>
                  </div>

                  {/* Note editor */}
                  {showNoteEditor && user && (
                    <div className="mb-8 bg-white p-6 rounded-xl shadow-lg border-2 border-blue-200">
                      <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        ✍️ Create New Note
                      </h3>
                      <NoteEditor
                        conversationId={selectedConversationId}
                        user={{
                          id: user.id,
                          name: user.name || user.email,
                          email: user.email,
                        }}
                        onSave={handleSaveNote}
                      />
                    </div>
                  )}

                  {/* Notes list */}
                  {isLoadingNotes ? (
                    <div className="text-center py-8 text-gray-500">
                      Loading notes...
                    </div>
                  ) : (
                    <NoteList
                      notes={notes}
                      currentUserId={user?.id || ''}
                      onNoteSelect={(note) => {
                        // Could open a modal or expand the note
                        console.log('Selected note:', note);
                      }}
                      onNoteDelete={handleDeleteNote}
                    />
                  )}

                  {/* Info box */}
                  {notes.length === 0 && !showNoteEditor && (
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-2xl p-8 text-center shadow-lg">
                      <DocumentTextIcon className="h-16 w-16 text-blue-500 mx-auto mb-4" />
                      <h3 className="text-2xl font-bold text-blue-900 mb-3">
                        No notes yet
                      </h3>
                      <p className="text-lg text-blue-800 mb-6 font-medium">
                        Start collaborating with your team by creating the first note
                      </p>
                      <div className="bg-white rounded-xl p-6 shadow-md border border-blue-200">
                        <h4 className="text-base font-bold text-gray-900 mb-4">✨ Features:</h4>
                        <ul className="text-base text-gray-700 space-y-3 text-left max-w-md mx-auto">
                          <li className="flex items-start gap-3">
                            <span className="text-blue-600 font-bold">@</span>
                            <span>Use <strong>@</strong> to mention team members and notify them</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <span className="text-green-600 font-bold">🔓</span>
                            <span>Toggle between <strong>public</strong> and <strong>private</strong> notes</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <span className="text-purple-600 font-bold">✍️</span>
                            <span>Rich text formatting with <strong>bold</strong>, <em>italic</em>, and lists</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <span className="text-orange-600 font-bold">💾</span>
                            <span>All changes are <strong>saved automatically</strong></span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <div className="text-gray-400 mb-4">
                <svg
                  className="w-16 h-16 mx-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                No conversation selected
              </h3>
              <p className="text-sm text-gray-500">
                Select a conversation from the list to view messages
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
