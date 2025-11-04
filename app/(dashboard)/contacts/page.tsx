'use client';

import { useState, useEffect } from 'react';
import {
  MagnifyingGlassIcon,
  UserPlusIcon,
  FunnelIcon,
  ExclamationTriangleIcon,
  UserCircleIcon,
  EnvelopeIcon,
  PhoneIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';
import { ContactSearch } from '@/components/contacts/contact-search';
import { ContactProfileModal } from '@/components/contacts/contact-profile-modal';
import { DuplicateDetector } from '@/components/contacts/duplicate-detector';
import { ContactMergeModal } from '@/components/contacts/contact-merge-modal';
import { ContactFormModal } from '@/components/contacts/contact-form-modal';

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

type ViewMode = 'list' | 'duplicates';

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeContacts, setMergeContacts] = useState<any[]>([]);
  const [primaryContact, setPrimaryContact] = useState<any>(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  useEffect(() => {
    fetchContacts();
  }, [page, selectedTag]);

  const fetchContacts = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });

      if (selectedTag) {
        params.append('tags', selectedTag);
      }

      const response = await fetch(`/api/contacts?${params}`);
      if (response.ok) {
        const data = await response.json();
        setContacts(data.contacts || []);
        setTotalPages(data.pagination?.pages || 1);
      }
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectContact = (contact: Contact) => {
    setSelectedContactId(contact.id);
    setShowProfileModal(true);
  };

  const handleMergeRequest = async (primaryId: string, secondaryIds: string[]) => {
    try {
      // Fetch full contact data
      const [primaryRes, ...secondaryRes] = await Promise.all([
        fetch(`/api/contacts/${primaryId}`),
        ...secondaryIds.map((id) => fetch(`/api/contacts/${id}`)),
      ]);

      const primary = await primaryRes.json();
      const secondary = await Promise.all(secondaryRes.map((r) => r.json()));

      setPrimaryContact(primary);
      setMergeContacts(secondary);
      setShowMergeModal(true);
    } catch (error) {
      console.error('Failed to fetch contacts for merge:', error);
    }
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
        fetchContacts(); // Refresh list
      }
    } catch (error) {
      console.error('Failed to merge contacts:', error);
    }
  };

  const handleCreateContact = async (data: any) => {
    const response = await fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create contact');
    }

    fetchContacts(); // Refresh list
  };

  const handleUpdateContact = async (data: any) => {
    if (!editingContact) return;

    const response = await fetch(`/api/contacts/${editingContact.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update contact');
    }

    fetchContacts(); // Refresh list
    setEditingContact(null);
  };

  const handleOpenCreateModal = () => {
    console.log('Opening create modal');
    setEditingContact(null);
    setShowFormModal(true);
  };

  const handleOpenEditModal = (contact: Contact) => {
    console.log('Opening edit modal for:', contact);
    setEditingContact(contact);
    setShowFormModal(true);
  };

  // Get all unique tags
  const allTags = Array.from(
    new Set(contacts.flatMap((contact) => contact.tags || []))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage your customer contacts and profiles
            </p>
          </div>
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <UserPlusIcon className="h-5 w-5" />
            Add Contact
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <ContactSearch
              onSelectContact={handleSelectContact}
              placeholder="Search contacts by name, email, or phone..."
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Contacts
            </button>
            <button
              onClick={() => setViewMode('duplicates')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                viewMode === 'duplicates'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <ExclamationTriangleIcon className="h-5 w-5" />
              Duplicates
            </button>
          </div>
        </div>

        {/* Tag Filters */}
        {allTags.length > 0 && viewMode === 'list' && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedTag(null)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                selectedTag === null
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  selectedTag === tag
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      {viewMode === 'list' ? (
        <>
          {/* Contacts List */}
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full" />
            </div>
          ) : contacts.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {contacts.map((contact) => (
                  <ContactCard
                    key={contact.id}
                    contact={contact}
                    onClick={() => handleSelectContact(contact)}
                    onEdit={(e) => {
                      e.stopPropagation();
                      handleOpenEditModal(contact);
                    }}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
              <UserCircleIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No contacts found
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                {selectedTag
                  ? `No contacts with tag "${selectedTag}"`
                  : 'Get started by adding your first contact'}
              </p>
              <button
                onClick={handleOpenCreateModal}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Contact
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <DuplicateDetector onMergeRequest={handleMergeRequest} threshold={60} />
        </div>
      )}

      {/* Contact Profile Modal */}
      {selectedContactId && (
        <ContactProfileModal
          contactId={selectedContactId}
          isOpen={showProfileModal}
          onClose={() => {
            setShowProfileModal(false);
            setSelectedContactId(null);
          }}
          onStartCall={(contactId, phone) => {
            console.log('Start call:', contactId, phone);
            // Integrate with VoIP
          }}
          onSendMessage={(contactId) => {
            console.log('Send message:', contactId);
            // Navigate to inbox with contact selected
          }}
          onEdit={(contact) => {
            handleOpenEditModal(contact);
          }}
        />
      )}

      {/* Merge Modal */}
      {primaryContact && showMergeModal && mergeContacts.length > 0 && (
        <ContactMergeModal
          primaryContact={primaryContact}
          secondaryContacts={mergeContacts}
          isOpen={showMergeModal}
          onClose={() => setShowMergeModal(false)}
          onMerge={handleMerge}
        />
      )}

      {/* Contact Form Modal */}
      <ContactFormModal
        isOpen={showFormModal}
        onClose={() => {
          setShowFormModal(false);
          setEditingContact(null);
        }}
        onSave={editingContact ? handleUpdateContact : handleCreateContact}
        contact={editingContact || undefined}
        mode={editingContact ? 'edit' : 'create'}
      />
    </div>
  );
}

/**
 * Contact Card Component
 */
function ContactCard({
  contact,
  onClick,
  onEdit,
}: {
  contact: Contact;
  onClick: () => void;
  onEdit: (e: React.MouseEvent) => void;
}) {
  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-4 hover:shadow-md hover:border-blue-300 transition-all relative group">
      {/* Edit Button */}
      <button
        onClick={onEdit}
        className="absolute top-2 right-2 p-2 bg-white rounded-lg shadow-sm border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-50"
        title="Edit contact"
      >
        <PencilIcon className="h-4 w-4 text-gray-600" />
      </button>

      <button onClick={onClick} className="w-full text-left">
        {/* Avatar */}
        <div className="flex items-start gap-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium text-lg flex-shrink-0">
            {contact.name ? contact.name.charAt(0).toUpperCase() : '?'}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 truncate">
              {contact.name || 'Unnamed Contact'}
            </h3>
            <p className="text-xs text-gray-500">
              {new Date(contact.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Contact Info */}
        <div className="space-y-2 mb-3">
          {contact.email && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <EnvelopeIcon className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{contact.email}</span>
            </div>
          )}
          {contact.phone && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <PhoneIcon className="h-4 w-4 flex-shrink-0" />
              <span>{contact.phone}</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {contact.tags && contact.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {contact.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full"
              >
                {tag}
              </span>
            ))}
            {contact.tags.length > 3 && (
              <span className="text-xs text-gray-500">
                +{contact.tags.length - 3} more
              </span>
            )}
          </div>
        )}
      </button>
    </div>
  );
}