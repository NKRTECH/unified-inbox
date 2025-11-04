/**
 * Contact Profile Modal Component
 * Comprehensive contact view with timeline, quick actions, and VoIP integration
 */

'use client';

import { useState, useEffect } from 'react';
import {
  XMarkIcon,
  PhoneIcon,
  EnvelopeIcon,
  ChatBubbleLeftIcon,
  PencilIcon,
  TrashIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { DuplicateDetector } from './duplicate-detector';
import { ContactMergeModal } from './contact-merge-modal';

interface Contact {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  tags: string[];
  customFields: any;
  socialHandles: any;
  createdAt: Date;
  updatedAt: Date;
}

interface TimelineEvent {
  type: 'message' | 'call';
  id: string;
  timestamp: Date;
  data: any;
}

interface ContactProfileModalProps {
  contactId: string;
  isOpen: boolean;
  onClose: () => void;
  onStartCall?: (contactId: string, phone: string) => void;
  onSendMessage?: (contactId: string) => void;
  onEdit?: (contact: Contact) => void;
}

export function ContactProfileModal({
  contactId,
  isOpen,
  onClose,
  onStartCall,
  onSendMessage,
  onEdit,
}: ContactProfileModalProps) {
  const [contact, setContact] = useState<Contact | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'timeline' | 'duplicates'>('timeline');
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeContacts, setMergeContacts] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && contactId) {
      fetchContactData();
    }
  }, [isOpen, contactId]);

  const fetchContactData = async () => {
    setIsLoading(true);
    try {
      const [contactRes, timelineRes] = await Promise.all([
        fetch(`/api/contacts/${contactId}`),
        fetch(`/api/contacts/${contactId}/timeline?limit=20`),
      ]);

      if (contactRes.ok) {
        const contactData = await contactRes.json();
        setContact(contactData);
      }

      if (timelineRes.ok) {
        const timelineData = await timelineRes.json();
        setTimeline(timelineData.timeline || []);
        setStats(timelineData.stats);
      }
    } catch (error) {
      console.error('Failed to fetch contact data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMergeRequest = (primaryId: string, secondaryIds: string[]) => {
    // Fetch full contact data for merge modal
    Promise.all(secondaryIds.map((id) => fetch(`/api/contacts/${id}`).then((r) => r.json())))
      .then((contacts) => {
        setMergeContacts(contacts);
        setShowMergeModal(true);
      });
  };

  const handleMerge = async (
    primaryId: string,
    secondaryIds: string[],
    strategy: any,
    customValues?: any
  ) => {
    try {
      const response = await fetch('/api/contacts/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryContactId: primaryId,
          secondaryContactIds: secondaryIds,
          mergeStrategy: strategy,
          customValues,
        }),
      });

      if (response.ok) {
        setShowMergeModal(false);
        fetchContactData(); // Refresh data
      }
    } catch (error) {
      console.error('Failed to merge contacts:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
            onClick={onClose}
          />

          {/* Modal */}
          <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
            {isLoading ? (
              <div className="flex items-center justify-center p-12">
                <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full" />
              </div>
            ) : contact ? (
              <>
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-6 text-white">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
                        {contact.name ? contact.name.charAt(0).toUpperCase() : '?'}
                      </div>

                      {/* Info */}
                      <div>
                        <h2 className="text-2xl font-bold">
                          {contact.name || 'Unnamed Contact'}
                        </h2>
                        <div className="mt-2 space-y-1">
                          {contact.email && (
                            <p className="text-sm text-white/90 flex items-center gap-2">
                              <EnvelopeIcon className="h-4 w-4" />
                              {contact.email}
                            </p>
                          )}
                          {contact.phone && (
                            <p className="text-sm text-white/90 flex items-center gap-2">
                              <PhoneIcon className="h-4 w-4" />
                              {contact.phone}
                            </p>
                          )}
                        </div>
                        {contact.tags && contact.tags.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {contact.tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-xs bg-white/20 px-2 py-1 rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={onClose}
                      className="text-white/80 hover:text-white"
                    >
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>

                  {/* Quick Actions */}
                  <div className="mt-6 flex gap-3">
                    {contact.phone && onStartCall && (
                      <button
                        onClick={() => onStartCall(contact.id, contact.phone!)}
                        className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                      >
                        <PhoneIcon className="h-5 w-5" />
                        Call
                      </button>
                    )}
                    {onSendMessage && (
                      <button
                        onClick={() => onSendMessage(contact.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                      >
                        <ChatBubbleLeftIcon className="h-5 w-5" />
                        Message
                      </button>
                    )}
                    {onEdit && (
                      <button
                        onClick={() => {
                          onEdit(contact);
                          onClose();
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                      >
                        <PencilIcon className="h-5 w-5" />
                        Edit
                      </button>
                    )}
                  </div>
                </div>

                {/* Stats */}
                {stats && (
                  <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                    <div className="grid grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900">
                          {stats.totalMessages}
                        </p>
                        <p className="text-sm text-gray-600">Messages</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900">
                          {stats.totalCalls}
                        </p>
                        <p className="text-sm text-gray-600">Calls</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900">
                          {stats.totalConversations}
                        </p>
                        <p className="text-sm text-gray-600">Conversations</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-900">
                          {stats.lastInteraction
                            ? new Date(stats.lastInteraction).toLocaleDateString()
                            : 'Never'}
                        </p>
                        <p className="text-sm text-gray-600">Last Contact</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tabs */}
                <div className="border-b border-gray-200">
                  <div className="flex">
                    <button
                      onClick={() => setActiveTab('timeline')}
                      className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'timeline'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Timeline
                    </button>
                    <button
                      onClick={() => setActiveTab('duplicates')}
                      className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'duplicates'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        Duplicates
                        <ExclamationTriangleIcon className="h-4 w-4" />
                      </div>
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="px-6 py-4 max-h-[50vh] overflow-y-auto">
                  {activeTab === 'timeline' ? (
                    <Timeline timeline={timeline} />
                  ) : (
                    <DuplicateDetector
                      contactId={contact.id}
                      onMergeRequest={handleMergeRequest}
                    />
                  )}
                </div>
              </>
            ) : (
              <div className="p-12 text-center text-gray-500">
                Contact not found
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Merge Modal */}
      {contact && showMergeModal && mergeContacts.length > 0 && (
        <ContactMergeModal
          primaryContact={contact}
          secondaryContacts={mergeContacts}
          isOpen={showMergeModal}
          onClose={() => setShowMergeModal(false)}
          onMerge={handleMerge}
        />
      )}
    </>
  );
}

/**
 * Timeline Component
 */
function Timeline({ timeline }: { timeline: TimelineEvent[] }) {
  if (timeline.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No activity yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {timeline.map((event) => (
        <TimelineItem key={event.id} event={event} />
      ))}
    </div>
  );
}

/**
 * Timeline Item Component
 */
function TimelineItem({ event }: { event: TimelineEvent }) {
  const { type, data, timestamp } = event;

  return (
    <div className="flex gap-4 p-4 bg-gray-50 rounded-lg">
      <div className="flex-shrink-0">
        {type === 'message' ? (
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <ChatBubbleLeftIcon className="h-5 w-5 text-blue-600" />
          </div>
        ) : (
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
            <PhoneIcon className="h-5 w-5 text-green-600" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-medium text-gray-900">
            {type === 'message' ? 'Message' : 'Call'} •{' '}
            <span className="text-gray-600">
              {data.channel || data.direction}
            </span>
          </p>
          <p className="text-xs text-gray-500">
            {new Date(timestamp).toLocaleString()}
          </p>
        </div>
        {type === 'message' && (
          <p className="text-sm text-gray-700 line-clamp-2">{data.content}</p>
        )}
        {type === 'call' && (
          <p className="text-sm text-gray-700">
            {data.status} • {data.duration ? `${data.duration}s` : 'No duration'}
          </p>
        )}
      </div>
    </div>
  );
}
