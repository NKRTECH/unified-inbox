'use client';

import { useState } from 'react';
import { ConversationFilters, ConversationSort } from '@/lib/types/conversation';
import { cn } from '@/lib/utils';

interface ConversationListFiltersProps {
  filters: ConversationFilters;
  sort: ConversationSort;
  onFilterChange: (filters: ConversationFilters) => void;
  onSortChange: (sort: ConversationSort) => void;
}

/**
 * ConversationListFilters provides filtering and sorting controls
 * for the conversation list
 */
export function ConversationListFilters({
  filters,
  sort,
  onFilterChange,
  onSortChange,
}: ConversationListFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);

  const handleStatusFilter = (status: 'ACTIVE' | 'RESOLVED' | 'ARCHIVED' | undefined) => {
    onFilterChange({
      ...filters,
      status,
    });
  };

  const handlePriorityFilter = (priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' | undefined) => {
    onFilterChange({
      ...filters,
      priority,
    });
  };

  const handleSortChange = (field: ConversationSort['field']) => {
    // Toggle order if same field, otherwise default to desc
    const newOrder = sort.field === field && sort.order === 'desc' ? 'asc' : 'desc';
    onSortChange({ field, order: newOrder });
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="space-y-2">
      {/* Quick Status Filters */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => handleStatusFilter(undefined)}
          className={cn(
            'px-3 py-1 text-xs font-medium rounded-full transition-colors',
            !filters.status
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          )}
        >
          All
        </button>
        <button
          onClick={() => handleStatusFilter('ACTIVE')}
          className={cn(
            'px-3 py-1 text-xs font-medium rounded-full transition-colors',
            filters.status === 'ACTIVE'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          )}
        >
          Active
        </button>
        <button
          onClick={() => handleStatusFilter('RESOLVED')}
          className={cn(
            'px-3 py-1 text-xs font-medium rounded-full transition-colors',
            filters.status === 'RESOLVED'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          )}
        >
          Resolved
        </button>
        <button
          onClick={() => handleStatusFilter('ARCHIVED')}
          className={cn(
            'px-3 py-1 text-xs font-medium rounded-full transition-colors',
            filters.status === 'ARCHIVED'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          )}
        >
          Archived
        </button>

        {/* More Filters Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="ml-auto px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors flex items-center space-x-1"
        >
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center justify-center w-4 h-4 text-xs font-bold text-white bg-blue-600 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="p-3 bg-gray-50 rounded-lg space-y-3 border border-gray-200">
          {/* Priority Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Priority
            </label>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePriorityFilter(undefined)}
                className={cn(
                  'px-2 py-1 text-xs rounded transition-colors',
                  !filters.priority
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                )}
              >
                All
              </button>
              <button
                onClick={() => handlePriorityFilter('URGENT')}
                className={cn(
                  'px-2 py-1 text-xs rounded transition-colors',
                  filters.priority === 'URGENT'
                    ? 'bg-red-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                )}
              >
                🔴 Urgent
              </button>
              <button
                onClick={() => handlePriorityFilter('HIGH')}
                className={cn(
                  'px-2 py-1 text-xs rounded transition-colors',
                  filters.priority === 'HIGH'
                    ? 'bg-orange-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                )}
              >
                🟠 High
              </button>
              <button
                onClick={() => handlePriorityFilter('NORMAL')}
                className={cn(
                  'px-2 py-1 text-xs rounded transition-colors',
                  filters.priority === 'NORMAL'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                )}
              >
                Normal
              </button>
              <button
                onClick={() => handlePriorityFilter('LOW')}
                className={cn(
                  'px-2 py-1 text-xs rounded transition-colors',
                  filters.priority === 'LOW'
                    ? 'bg-gray-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                )}
              >
                Low
              </button>
            </div>
          </div>

          {/* Sort Options */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Sort by
            </label>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleSortChange('updatedAt')}
                className={cn(
                  'px-2 py-1 text-xs rounded transition-colors flex items-center space-x-1',
                  sort.field === 'updatedAt'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                )}
              >
                <span>Recent</span>
                {sort.field === 'updatedAt' && (
                  <span>{sort.order === 'desc' ? '↓' : '↑'}</span>
                )}
              </button>
              <button
                onClick={() => handleSortChange('createdAt')}
                className={cn(
                  'px-2 py-1 text-xs rounded transition-colors flex items-center space-x-1',
                  sort.field === 'createdAt'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                )}
              >
                <span>Created</span>
                {sort.field === 'createdAt' && (
                  <span>{sort.order === 'desc' ? '↓' : '↑'}</span>
                )}
              </button>
              <button
                onClick={() => handleSortChange('priority')}
                className={cn(
                  'px-2 py-1 text-xs rounded transition-colors flex items-center space-x-1',
                  sort.field === 'priority'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                )}
              >
                <span>Priority</span>
                {sort.field === 'priority' && (
                  <span>{sort.order === 'desc' ? '↓' : '↑'}</span>
                )}
              </button>
            </div>
          </div>

          {/* Clear Filters */}
          {activeFilterCount > 0 && (
            <button
              onClick={() => {
                onFilterChange({});
                onSortChange({ field: 'updatedAt', order: 'desc' });
              }}
              className="w-full px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}