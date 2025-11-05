/**
 * Contact Search Component
 * Advanced search with fuzzy matching and autocomplete
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MagnifyingGlassIcon, XMarkIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { useDebounce } from '@/lib/hooks/use-debounce';

interface Contact {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  tags: string[];
  relevanceScore?: number;
  _count?: {
    conversations: number;
    messages: number;
  };
}

interface ContactSearchProps {
  // Accept a flexible contact shape to avoid duplicate-type conflicts across modules
  onSelectContact: (contact: any) => void;
  placeholder?: string;
  autoFocus?: boolean;
  showRecentContacts?: boolean;
}

export function ContactSearch({
  onSelectContact,
  placeholder = 'Search contacts...',
  autoFocus = false,
  showRecentContacts = true,
}: ContactSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(query, 300);

  // Search contacts
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const searchContacts = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/contacts/search?q=${encodeURIComponent(debouncedQuery)}&limit=10`
        );
        
        if (response.ok) {
          const data = await response.json();
          setResults(data.results || []);
          setIsOpen(true);
          setSelectedIndex(0);
        }
      } catch (error) {
        console.error('Failed to search contacts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    searchContacts();
  }, [debouncedQuery]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || results.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % results.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            handleSelectContact(results[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          break;
      }
    },
    [isOpen, results, selectedIndex]
  );

  // Handle contact selection
  const handleSelectContact = (contact: Contact) => {
    onSelectContact(contact);
    setQuery('');
    setResults([]);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  // Handle clear
  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <XMarkIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
          </button>
        )}
        {isLoading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
          </div>
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && results.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-2 w-full bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-y-auto"
        >
          {results.map((contact, index) => (
            <button
              key={contact.id}
              onClick={() => handleSelectContact(contact)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`w-full px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors ${
                index === selectedIndex ? 'bg-blue-50' : ''
              } ${index !== 0 ? 'border-t border-gray-100' : ''}`}
            >
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium">
                  {contact.name ? contact.name.charAt(0).toUpperCase() : <UserCircleIcon className="w-6 h-6" />}
                </div>
              </div>

              {/* Contact Info */}
              <div className="flex-1 text-left min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900 truncate">
                    {contact.name || 'Unnamed Contact'}
                  </p>
                  {contact.relevanceScore && contact.relevanceScore > 80 && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                      Best match
                    </span>
                  )}
                </div>
                <div className="mt-1 space-y-0.5">
                  {contact.email && (
                    <p className="text-sm text-gray-600 truncate">{contact.email}</p>
                  )}
                  {contact.phone && (
                    <p className="text-sm text-gray-600">{contact.phone}</p>
                  )}
                </div>
                {contact.tags && contact.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {contact.tags.slice(0, 3).map((tag: string) => (
                      <span
                        key={tag}
                        className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full"
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
              </div>

              {/* Stats */}
              {contact._count && (
                <div className="flex-shrink-0 text-right">
                  <p className="text-xs text-gray-500">
                    {contact._count.conversations} conv
                  </p>
                  <p className="text-xs text-gray-500">
                    {contact._count.messages} msg
                  </p>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* No Results */}
      {isOpen && !isLoading && query.length >= 2 && results.length === 0 && (
        <div className="absolute z-50 mt-2 w-full bg-white rounded-lg shadow-lg border border-gray-200 p-4 text-center text-gray-500">
          No contacts found for "{query}"
        </div>
      )}
    </div>
  );
}

/**
 * Compact Contact Search (for smaller spaces)
 */
export function CompactContactSearch({
  onSelectContact,
  placeholder = 'Search...',
}: Omit<ContactSearchProps, 'autoFocus' | 'showRecentContacts'>) {
  return (
    <div className="w-64">
      <ContactSearch
        onSelectContact={onSelectContact}
        placeholder={placeholder}
        showRecentContacts={false}
      />
    </div>
  );
}
