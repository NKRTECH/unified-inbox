/**
 * Template Form Modal Component
 * Create and edit message templates
 */

'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

interface TemplateFormData {
  name: string;
  content: string;
  description: string;
  category: string;
}

interface TemplateFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: TemplateFormData) => Promise<void>;
  template?: {
    id: string;
    name: string;
    content: string;
    description?: string;
    category?: string;
    variables: string[];
  };
  mode: 'create' | 'edit';
  categories?: string[];
}

export function TemplateFormModal({
  isOpen,
  onClose,
  onSave,
  template,
  mode,
  categories = [],
}: TemplateFormModalProps) {
  const [formData, setFormData] = useState<TemplateFormData>({
    name: '',
    content: '',
    description: '',
    category: '',
  });
  const [detectedVariables, setDetectedVariables] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form data when template changes
  useEffect(() => {
    if (template && mode === 'edit') {
      setFormData({
        name: template.name,
        content: template.content,
        description: template.description || '',
        category: template.category || '',
      });
      setDetectedVariables(template.variables);
    } else {
      setFormData({
        name: '',
        content: '',
        description: '',
        category: '',
      });
      setDetectedVariables([]);
    }
    setErrors({});
  }, [template, mode, isOpen]);

  // Detect variables in content
  useEffect(() => {
    const variablePattern = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;
    const variables = new Set<string>();
    let match;

    while ((match = variablePattern.exec(formData.content)) !== null) {
      variables.add(match[1]);
    }

    setDetectedVariables(Array.from(variables));
  }, [formData.content]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Template name is required';
    }

    if (!formData.content.trim()) {
      newErrors.content = 'Template content is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Failed to save template:', error);
      setErrors({ submit: 'Failed to save template. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const insertVariable = (variableName: string) => {
    const textarea = document.getElementById('template-content') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = formData.content;
    const before = text.substring(0, start);
    const after = text.substring(end);
    const variable = `{{${variableName}}}`;

    setFormData({
      ...formData,
      content: before + variable + after,
    });

    // Set cursor position after inserted variable
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto flex items-center justify-center">
      <div className="w-full max-w-3xl mx-auto px-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-900 bg-opacity-50"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-3xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-5 border-b border-purple-800">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <DocumentTextIcon className="h-6 w-6" />
                {mode === 'create' ? 'Create Template' : 'Edit Template'}
              </h3>
              <button
                onClick={onClose}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-white px-6 py-6">
            <div className="space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Template Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className={`block w-full px-4 py-3 text-base text-gray-900 font-medium border-2 rounded-lg focus:ring-2 focus:ring-purple-500 transition-colors ${
                    errors.name ? 'border-red-400 bg-red-50' : 'border-gray-300 focus:border-purple-500'
                  }`}
                  placeholder="e.g., Welcome Message"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="block w-full px-4 py-3 text-base text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                  placeholder="Brief description of this template"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Category
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  list="categories"
                  className="block w-full px-4 py-3 text-base text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                  placeholder="e.g., marketing, support, notification"
                />
                {categories.length > 0 && (
                  <datalist id="categories">
                    {categories.map(cat => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                )}
              </div>

              {/* Content */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-bold text-gray-900">
                    Template Content <span className="text-red-600">*</span>
                  </label>
                  <div className="text-xs text-gray-500">
                    Use {`{{variableName}}`} for dynamic content
                  </div>
                </div>
                <textarea
                  id="template-content"
                  value={formData.content}
                  onChange={(e) =>
                    setFormData({ ...formData, content: e.target.value })
                  }
                  rows={8}
                  className={`block w-full px-4 py-3 text-base text-gray-900 font-medium border-2 rounded-lg focus:ring-2 focus:ring-purple-500 transition-colors font-mono ${
                    errors.content
                      ? 'border-red-400 bg-red-50'
                      : 'border-gray-300 focus:border-purple-500'
                  }`}
                  placeholder="Hello {{name}}, welcome to our service!"
                />
                {errors.content && (
                  <p className="mt-1 text-sm text-red-600">{errors.content}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  {formData.content.length} characters
                </p>
              </div>

              {/* Quick Insert Variables */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="text-sm font-bold text-gray-900 mb-2">
                  Quick Insert Variables
                </h4>
                <div className="flex flex-wrap gap-2">
                  {['name', 'email', 'phone', 'company', 'date', 'time'].map(variable => (
                    <button
                      key={variable}
                      type="button"
                      onClick={() => insertVariable(variable)}
                      className="px-3 py-1 bg-white border border-purple-300 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors text-sm font-mono"
                    >
                      {`{{${variable}}}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Detected Variables */}
              {detectedVariables.length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="text-sm font-bold text-gray-900 mb-2">
                    Detected Variables ({detectedVariables.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {detectedVariables.map(variable => (
                      <span
                        key={variable}
                        className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm font-mono"
                      >
                        {`{{${variable}}}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Submit Error */}
              {errors.submit && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-600">{errors.submit}</p>
                </div>
              )}
            </div>
          </form>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-5 border-t border-gray-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 py-3 border-2 border-gray-300 rounded-lg text-gray-900 font-semibold hover:bg-gray-100 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 flex items-center gap-2 font-semibold shadow-lg transition-all"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                  Saving...
                </>
              ) : (
                <>
                  <DocumentTextIcon className="h-5 w-5" />
                  {mode === 'create' ? 'Create Template' : 'Save Changes'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
