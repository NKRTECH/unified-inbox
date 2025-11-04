/**
 * Contact Merge Modal Component
 * UI for merging duplicate contacts with conflict resolution
 */

'use client';

import { useState } from 'react';
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';

interface Contact {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  tags: string[];
  customFields: any;
  socialHandles: any;
  createdAt: Date;
  _count?: {
    conversations: number;
    messages: number;
  };
}

interface ContactMergeModalProps {
  primaryContact: Contact;
  secondaryContacts: Contact[];
  isOpen: boolean;
  onClose: () => void;
  onMerge: (primaryId: string, secondaryIds: string[], strategy: MergeStrategy, customValues?: any) => Promise<void>;
}

interface MergeStrategy {
  name: 'primary' | 'secondary' | 'custom';
  email: 'primary' | 'secondary' | 'custom';
  phone: 'primary' | 'secondary' | 'custom';
  tags: 'merge' | 'primary' | 'secondary';
  customFields: 'merge' | 'primary' | 'secondary';
  socialHandles: 'merge' | 'primary' | 'secondary';
}

export function ContactMergeModal({
  primaryContact,
  secondaryContacts,
  isOpen,
  onClose,
  onMerge,
}: ContactMergeModalProps) {
  const [strategy, setStrategy] = useState<MergeStrategy>({
    name: 'primary',
    email: 'primary',
    phone: 'primary',
    tags: 'merge',
    customFields: 'merge',
    socialHandles: 'merge',
  });
  
  const [customValues, setCustomValues] = useState({
    name: '',
    email: '',
    phone: '',
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleMerge = async () => {
    setIsSubmitting(true);
    try {
      const secondaryIds = secondaryContacts.map((c) => c.id);
      const values = strategy.name === 'custom' || strategy.email === 'custom' || strategy.phone === 'custom'
        ? customValues
        : undefined;
      
      await onMerge(primaryContact.id, secondaryIds, strategy, values);
      onClose();
    } catch (error) {
      console.error('Failed to merge contacts:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const allContacts = [primaryContact, ...secondaryContacts];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="bg-white px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                Merge Contacts
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Merging {secondaryContacts.length} contact(s) into primary contact
            </p>
          </div>

          {/* Content */}
          <div className="bg-gray-50 px-6 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-6">
              {/* Name */}
              <MergeField
                label="Name"
                field="name"
                contacts={allContacts}
                strategy={strategy.name}
                onStrategyChange={(value) => setStrategy({ ...strategy, name: value as any })}
                customValue={customValues.name}
                onCustomValueChange={(value) => setCustomValues({ ...customValues, name: value })}
              />

              {/* Email */}
              <MergeField
                label="Email"
                field="email"
                contacts={allContacts}
                strategy={strategy.email}
                onStrategyChange={(value) => setStrategy({ ...strategy, email: value as any })}
                customValue={customValues.email}
                onCustomValueChange={(value) => setCustomValues({ ...customValues, email: value })}
              />

              {/* Phone */}
              <MergeField
                label="Phone"
                field="phone"
                contacts={allContacts}
                strategy={strategy.phone}
                onStrategyChange={(value) => setStrategy({ ...strategy, phone: value as any })}
                customValue={customValues.phone}
                onCustomValueChange={(value) => setCustomValues({ ...customValues, phone: value })}
              />

              {/* Tags */}
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Tags
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={strategy.tags === 'merge'}
                      onChange={() => setStrategy({ ...strategy, tags: 'merge' })}
                    />
                    <span className="text-sm">Merge all tags</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={strategy.tags === 'primary'}
                      onChange={() => setStrategy({ ...strategy, tags: 'primary' })}
                    />
                    <span className="text-sm">Keep primary contact tags only</span>
                  </label>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {Array.from(new Set(allContacts.flatMap((c) => c.tags))).map((tag) => (
                    <span
                      key={tag}
                      className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Custom Fields & Social Handles */}
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Custom Fields & Social Handles
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={strategy.customFields === 'merge'}
                      onChange={() => setStrategy({
                        ...strategy,
                        customFields: 'merge',
                        socialHandles: 'merge',
                      })}
                    />
                    <span className="text-sm">Merge all fields</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={strategy.customFields === 'primary'}
                      onChange={() => setStrategy({
                        ...strategy,
                        customFields: 'primary',
                        socialHandles: 'primary',
                      })}
                    />
                    <span className="text-sm">Keep primary contact fields only</span>
                  </label>
                </div>
              </div>

              {/* Preview */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-2">
                  Merge Summary
                </h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• {secondaryContacts.length} contact(s) will be merged</li>
                  <li>
                    • All conversations and messages will be transferred to primary contact
                  </li>
                  <li>• Secondary contacts will be deleted after merge</li>
                  <li>• This action cannot be undone</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleMerge}
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Merging...
                </>
              ) : (
                <>
                  <CheckIcon className="h-5 w-5" />
                  Merge Contacts
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Merge Field Component
 */
function MergeField({
  label,
  field,
  contacts,
  strategy,
  onStrategyChange,
  customValue,
  onCustomValueChange,
}: {
  label: string;
  field: 'name' | 'email' | 'phone';
  contacts: Contact[];
  strategy: 'primary' | 'secondary' | 'custom';
  onStrategyChange: (value: string) => void;
  customValue: string;
  onCustomValueChange: (value: string) => void;
}) {
  const values = contacts.map((c) => c[field]).filter(Boolean);
  const uniqueValues = Array.from(new Set(values));

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200">
      <label className="block text-sm font-medium text-gray-700 mb-3">
        {label}
      </label>
      <div className="space-y-2">
        {uniqueValues.map((value, index) => (
          <label key={index} className="flex items-center gap-2">
            <input
              type="radio"
              checked={strategy === (index === 0 ? 'primary' : 'secondary') && value === (index === 0 ? contacts[0][field] : value)}
              onChange={() => onStrategyChange(index === 0 ? 'primary' : 'secondary')}
            />
            <span className="text-sm">{value}</span>
            {index === 0 && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                Primary
              </span>
            )}
          </label>
        ))}
        <label className="flex items-center gap-2">
          <input
            type="radio"
            checked={strategy === 'custom'}
            onChange={() => onStrategyChange('custom')}
          />
          <span className="text-sm">Custom value</span>
        </label>
        {strategy === 'custom' && (
          <input
            type="text"
            value={customValue}
            onChange={(e) => onCustomValueChange(e.target.value)}
            placeholder={`Enter custom ${label.toLowerCase()}`}
            className="ml-6 mt-2 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        )}
      </div>
    </div>
  );
}
