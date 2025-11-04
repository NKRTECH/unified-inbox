/**
 * Duplicate Contact Detector Component
 * Shows potential duplicate contacts with merge options
 */

'use client';

import { useState, useEffect } from 'react';
import { ExclamationTriangleIcon, UserGroupIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface Contact {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  createdAt: Date;
  _count: {
    conversations: number;
    messages: number;
  };
}

interface DuplicateGroup {
  contacts: Contact[];
  similarity: {
    score: number;
    reasons: string[];
    matchedFields: string[];
  };
}

interface DuplicateDetectorProps {
  contactId?: string;
  onMergeRequest: (primaryId: string, secondaryIds: string[]) => void;
  threshold?: number;
}

export function DuplicateDetector({
  contactId,
  onMergeRequest,
  threshold = 60,
}: DuplicateDetectorProps) {
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [dismissedGroups, setDismissedGroups] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchDuplicates();
  }, [contactId, threshold]);

  const fetchDuplicates = async () => {
    setIsLoading(true);
    try {
      const url = contactId
        ? `/api/contacts/duplicates?contactId=${contactId}&threshold=${threshold}`
        : `/api/contacts/duplicates?threshold=${threshold}`;
      
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        
        if (contactId) {
          setDuplicates(data.duplicates || []);
        } else {
          setGroups(data.groups || []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch duplicates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleContact = (contactId: string) => {
    setSelectedContacts((prev) => {
      const next = new Set(prev);
      if (next.has(contactId)) {
        next.delete(contactId);
      } else {
        next.add(contactId);
      }
      return next;
    });
  };

  const handleMerge = (primaryId: string, secondaryIds: string[]) => {
    onMergeRequest(primaryId, secondaryIds);
    setSelectedContacts(new Set());
  };

  const handleDismissGroup = (groupIndex: number) => {
    setDismissedGroups((prev) => new Set(prev).add(groupIndex));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Single contact view
  if (contactId && duplicates.length > 0) {
    return (
      <div className="space-y-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-yellow-900">
                Potential Duplicates Found
              </h3>
              <p className="text-sm text-yellow-700 mt-1">
                We found {duplicates.length} contact(s) that might be duplicates
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {duplicates.map((duplicate: any) => (
            <DuplicateContactCard
              key={duplicate.id}
              contact={duplicate}
              similarity={duplicate.similarity}
              isSelected={selectedContacts.has(duplicate.id)}
              onToggle={() => handleToggleContact(duplicate.id)}
            />
          ))}
        </div>

        {selectedContacts.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-blue-900">
                {selectedContacts.size} contact(s) selected for merge
              </p>
              <button
                onClick={() => handleMerge(contactId, Array.from(selectedContacts))}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Merge Selected
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // All duplicates view
  if (groups.length > 0) {
    const visibleGroups = groups.filter((_, index) => !dismissedGroups.has(index));

    if (visibleGroups.length === 0) {
      return (
        <div className="text-center p-8 text-gray-500">
          <UserGroupIcon className="h-12 w-12 mx-auto mb-3 text-gray-400" />
          <p>No duplicate contacts found</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-yellow-900">
                {visibleGroups.length} Duplicate Group(s) Found
              </h3>
              <p className="text-sm text-yellow-700 mt-1">
                Review and merge duplicate contacts to keep your data clean
              </p>
            </div>
          </div>
        </div>

        {visibleGroups.map((group, groupIndex) => (
          <div
            key={groupIndex}
            className="bg-white border border-gray-200 rounded-lg p-6 relative"
          >
            <button
              onClick={() => handleDismissGroup(groupIndex)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>

            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-medium text-gray-900">Duplicate Group</h4>
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                  {group.similarity.score}% match
                </span>
              </div>
              <p className="text-sm text-gray-600">
                {group.similarity.reasons.join(', ')}
              </p>
            </div>

            <div className="space-y-3">
              {group.contacts.map((contact) => (
                <DuplicateContactCard
                  key={contact.id}
                  contact={contact}
                  similarity={group.similarity}
                  isSelected={selectedContacts.has(contact.id)}
                  onToggle={() => handleToggleContact(contact.id)}
                />
              ))}
            </div>

            {selectedContacts.size >= 2 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    const selected = Array.from(selectedContacts);
                    handleMerge(selected[0], selected.slice(1));
                  }}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Merge {selectedContacts.size} Contacts
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="text-center p-8 text-gray-500">
      <UserGroupIcon className="h-12 w-12 mx-auto mb-3 text-gray-400" />
      <p>No duplicate contacts found</p>
    </div>
  );
}

/**
 * Duplicate Contact Card
 */
function DuplicateContactCard({
  contact,
  similarity,
  isSelected,
  onToggle,
}: {
  contact: Contact;
  similarity: { score: number; reasons: string[]; matchedFields: string[] };
  isSelected: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`border rounded-lg p-4 cursor-pointer transition-all ${
        isSelected
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={onToggle}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggle}
          className="mt-1"
          onClick={(e) => e.stopPropagation()}
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h5 className="font-medium text-gray-900">
              {contact.name || 'Unnamed Contact'}
            </h5>
            {similarity.matchedFields.map((field) => (
              <span
                key={field}
                className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full"
              >
                {field}
              </span>
            ))}
          </div>
          
          <div className="space-y-1 text-sm text-gray-600">
            {contact.email && <p>📧 {contact.email}</p>}
            {contact.phone && <p>📱 {contact.phone}</p>}
            <p className="text-xs text-gray-500">
              Created {new Date(contact.createdAt).toLocaleDateString()} •{' '}
              {contact._count.conversations} conversations •{' '}
              {contact._count.messages} messages
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
