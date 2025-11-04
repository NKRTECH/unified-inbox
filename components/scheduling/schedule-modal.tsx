/**
 * Schedule Modal Component
 * Schedule messages for future delivery
 */

'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon, CalendarIcon, ClockIcon } from '@heroicons/react/24/outline';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSchedule: (data: {
    scheduledFor: Date;
    content: string;
    templateId?: string;
    variables?: Record<string, any>;
  }) => Promise<void>;
  initialContent?: string;
  templates?: Array<{
    id: string;
    name: string;
    content: string;
    variables: string[];
  }>;
}

export function ScheduleModal({
  isOpen,
  onClose,
  onSchedule,
  initialContent = '',
  templates = [],
}: ScheduleModalProps) {
  const [content, setContent] = useState(initialContent);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [variables, setVariables] = useState<Record<string, any>>({});
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form when modal opens
  useEffect(() => {
    if (isOpen) {
      setContent(initialContent);
      setSelectedTemplateId('');
      setVariables({});
      
      // Set default to tomorrow at 9 AM
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      
      setScheduledDate(tomorrow.toISOString().split('T')[0]);
      setScheduledTime('09:00');
      setErrors({});
    }
  }, [isOpen, initialContent]);

  // Handle template selection
  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    
    if (templateId) {
      const template = templates.find(t => t.id === templateId);
      if (template) {
        setContent(template.content);
        
        // Initialize variables
        const newVariables: Record<string, any> = {};
        template.variables.forEach(varName => {
          newVariables[varName] = '';
        });
        setVariables(newVariables);
      }
    } else {
      setContent(initialContent);
      setVariables({});
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!content.trim()) {
      newErrors.content = 'Message content is required';
    }

    if (!scheduledDate) {
      newErrors.scheduledDate = 'Date is required';
    }

    if (!scheduledTime) {
      newErrors.scheduledTime = 'Time is required';
    }

    if (scheduledDate && scheduledTime) {
      const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
      if (scheduledDateTime <= new Date()) {
        newErrors.scheduledDate = 'Scheduled time must be in the future';
      }
    }

    // Validate template variables
    if (selectedTemplateId) {
      const template = templates.find(t => t.id === selectedTemplateId);
      if (template) {
        template.variables.forEach(varName => {
          if (!variables[varName] || !variables[varName].toString().trim()) {
            newErrors[`var_${varName}`] = `${varName} is required`;
          }
        });
      }
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
      const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
      
      await onSchedule({
        scheduledFor: scheduledDateTime,
        content,
        templateId: selectedTemplateId || undefined,
        variables: Object.keys(variables).length > 0 ? variables : undefined,
      });
      
      onClose();
    } catch (error) {
      console.error('Failed to schedule message:', error);
      setErrors({ submit: 'Failed to schedule message. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get selected template
  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  // Preview content with variables applied
  const getPreviewContent = () => {
    let preview = content;
    if (selectedTemplate && Object.keys(variables).length > 0) {
      Object.entries(variables).forEach(([key, value]) => {
        const pattern = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        preview = preview.replace(pattern, value || `{{${key}}}`);
      });
    }
    return preview;
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
                <CalendarIcon className="h-6 w-6" />
                Schedule Message
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
              {/* Template Selector */}
              {templates.length > 0 && (
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    📝 Message Template (Optional)
                  </label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => handleTemplateChange(e.target.value)}
                    className="block w-full px-4 py-3 text-base text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                  >
                    <option value="">Custom message (no template)</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Template Variables */}
              {selectedTemplate && selectedTemplate.variables.length > 0 && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h4 className="text-sm font-bold text-gray-900 mb-3">
                    Template Variables
                  </h4>
                  <div className="space-y-3">
                    {selectedTemplate.variables.map((varName) => (
                      <div key={varName}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {varName}
                        </label>
                        <input
                          type="text"
                          value={variables[varName] || ''}
                          onChange={(e) =>
                            setVariables({
                              ...variables,
                              [varName]: e.target.value,
                            })
                          }
                          className={`block w-full px-3 py-2 text-sm border-2 rounded-lg focus:ring-2 focus:ring-purple-500 transition-colors ${
                            errors[`var_${varName}`]
                              ? 'border-red-400 bg-red-50'
                              : 'border-gray-300 focus:border-purple-500'
                          }`}
                          placeholder={`Enter ${varName}...`}
                        />
                        {errors[`var_${varName}`] && (
                          <p className="mt-1 text-xs text-red-600">
                            {errors[`var_${varName}`]}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Message Content */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Message Content <span className="text-red-600">*</span>
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={6}
                  className={`block w-full px-4 py-3 text-base text-gray-900 font-medium border-2 rounded-lg focus:ring-2 focus:ring-purple-500 transition-colors ${
                    errors.content
                      ? 'border-red-400 bg-red-50'
                      : 'border-gray-300 focus:border-purple-500'
                  }`}
                  placeholder="Type your message here..."
                  disabled={!!selectedTemplateId}
                />
                {errors.content && (
                  <p className="mt-1 text-sm text-red-600">{errors.content}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  {content.length} characters
                </p>
              </div>

              {/* Preview */}
              {selectedTemplate && Object.keys(variables).length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="text-sm font-bold text-gray-900 mb-2">
                    Preview
                  </h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {getPreviewContent()}
                  </p>
                </div>
              )}

              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    <CalendarIcon className="inline h-4 w-4 mr-1" />
                    Date <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className={`block w-full px-4 py-3 text-base text-gray-900 font-medium border-2 rounded-lg focus:ring-2 focus:ring-purple-500 transition-colors ${
                      errors.scheduledDate
                        ? 'border-red-400 bg-red-50'
                        : 'border-gray-300 focus:border-purple-500'
                    }`}
                  />
                  {errors.scheduledDate && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.scheduledDate}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    <ClockIcon className="inline h-4 w-4 mr-1" />
                    Time <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className={`block w-full px-4 py-3 text-base text-gray-900 font-medium border-2 rounded-lg focus:ring-2 focus:ring-purple-500 transition-colors ${
                      errors.scheduledTime
                        ? 'border-red-400 bg-red-50'
                        : 'border-gray-300 focus:border-purple-500'
                    }`}
                  />
                  {errors.scheduledTime && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.scheduledTime}
                    </p>
                  )}
                </div>
              </div>

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
                  Scheduling...
                </>
              ) : (
                <>
                  <CalendarIcon className="h-5 w-5" />
                  Schedule Message
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
