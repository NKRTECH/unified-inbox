/**
 * Template Selector Component
 * Select and preview message templates
 */

'use client';

import { useState, useEffect } from 'react';
import { DocumentTextIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  description?: string;
  variables: string[];
  category?: string;
}

interface TemplateSelectorProps {
  templates: MessageTemplate[];
  selectedTemplateId?: string;
  onSelect: (template: MessageTemplate | null) => void;
  onCreateNew?: () => void;
}

export function TemplateSelector({
  templates,
  selectedTemplateId,
  onSelect,
  onCreateNew,
}: TemplateSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Get unique categories
  const categories = ['all', ...new Set(templates.map(t => t.category).filter(Boolean))];

  // Filter templates
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.content.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = 
      selectedCategory === 'all' || template.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  return (
    <div className="space-y-4">
      {/* Search and Filter */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
        >
          {categories.map(category => (
            <option key={category} value={category}>
              {category === 'all' ? 'All Categories' : category}
            </option>
          ))}
        </select>

        {onCreateNew && (
          <button
            onClick={onCreateNew}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium whitespace-nowrap"
          >
            + New Template
          </button>
        )}
      </div>

      {/* Template List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
        {/* No Template Option */}
        <button
          onClick={() => onSelect(null)}
          className={`text-left p-4 border-2 rounded-lg transition-all ${
            !selectedTemplateId
              ? 'border-purple-500 bg-purple-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-start gap-3">
            <DocumentTextIcon className="h-5 w-5 text-gray-400 mt-0.5" />
            <div>
              <h4 className="font-semibold text-gray-900">Custom Message</h4>
              <p className="text-sm text-gray-500 mt-1">
                Write a custom message without using a template
              </p>
            </div>
          </div>
        </button>

        {/* Template Options */}
        {filteredTemplates.map(template => (
          <button
            key={template.id}
            onClick={() => onSelect(template)}
            className={`text-left p-4 border-2 rounded-lg transition-all ${
              selectedTemplateId === template.id
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start gap-3">
              <DocumentTextIcon className="h-5 w-5 text-purple-600 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-gray-900 truncate">
                    {template.name}
                  </h4>
                  {template.category && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                      {template.category}
                    </span>
                  )}
                </div>
                {template.description && (
                  <p className="text-sm text-gray-500 mb-2 line-clamp-2">
                    {template.description}
                  </p>
                )}
                {template.variables.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {template.variables.map(variable => (
                      <span
                        key={variable}
                        className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-mono"
                      >
                        {`{{${variable}}}`}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </button>
        ))}

        {filteredTemplates.length === 0 && (
          <div className="col-span-2 text-center py-8 text-gray-500">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-300 mb-2" />
            <p>No templates found</p>
          </div>
        )}
      </div>

      {/* Selected Template Preview */}
      {selectedTemplate && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-bold text-gray-900 mb-2">
            Template Preview
          </h4>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {selectedTemplate.content}
          </p>
        </div>
      )}
    </div>
  );
}
