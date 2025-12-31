'use client';

import { useState, useEffect } from 'react';
import { TaskType, TaskTemplate, taskApi } from '@/lib/api';

interface AssignTaskModalProps {
  memberName: string;
  memberId: string; // Will be used in Step 2 implementation to assign tasks to specific member
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'select_type' | 'configure';

// Task type definitions - moved outside component to avoid recreating on every render
const taskTypes = [
  {
    type: 'conversation_prompt' as TaskType,
    name: 'Conversation Prompt',
    icon: '💬',
    description: 'Topics for member to discuss with AI counselor',
    examples: 'Coping strategies, Gratitude practice',
  },
  {
    type: 'offline_task' as TaskType,
    name: 'Offline Task',
    icon: '✓',
    description: 'Activities for member to complete outside conversations',
    examples: 'Journal daily, Practice breathing exercises',
  },
  {
    type: 'guided_conversation' as TaskType,
    name: 'Guided Conversation',
    icon: '🗺️',
    description: 'Structured conversation flow with specific prompts',
    examples: 'CBT thought challenge, Goal setting session',
  },
];

export default function AssignTaskModal({
  memberName,
  memberId,
  onClose,
  onSuccess,
}: AssignTaskModalProps) {
  const [step, setStep] = useState<Step>('select_type');
  const [selectedType, setSelectedType] = useState<TaskType | null>(null);

  // Step 2 state
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [counselorNotes, setCounselorNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Fetch templates when type is selected and step is configure
  useEffect(() => {
    if (selectedType && step === 'configure') {
      const fetchTemplates = async () => {
        setLoadingTemplates(true);
        try {
          const response = await taskApi.getTemplates();
          if (response.ok) {
            const data = await response.json();
            const filtered = data.filter((t: TaskTemplate) => t.type === selectedType);
            setTemplates(filtered);
          } else {
            setError('Failed to load templates. Please try again.');
          }
        } catch (err) {
          console.error('Error loading templates:', err);
          setError('Failed to load templates. Please try again.');
        } finally {
          setLoadingTemplates(false);
        }
      };
      fetchTemplates();
    }
  }, [selectedType, step]);

  // Auto-fill title and description when template is selected
  useEffect(() => {
    if (selectedTemplate) {
      if (selectedTemplate === 'custom') {
        setTitle('');
        setDescription('');
      } else {
        const template = templates.find((t) => t.id === selectedTemplate);
        if (template) {
          setTitle(template.title);
          setDescription(template.description);
        }
      }
    }
  }, [selectedTemplate, templates]);

  const handleTypeSelect = (type: TaskType) => {
    setSelectedType(type);
    setStep('configure');
  };

  const handleBack = () => {
    setStep('select_type');
    setTemplates([]);
    setSelectedTemplate('');
    setTitle('');
    setDescription('');
    setDueDate('');
    setCounselorNotes('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedType) {
      setError('Task type not selected');
      return;
    }

    if (!title.trim() || !description.trim()) {
      setError('Title and description are required');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await taskApi.create({
        memberId,
        type: selectedType,
        title: title.trim(),
        description: description.trim(),
        dueDate: dueDate || undefined,
        priority,
        counselorNotes: counselorNotes.trim() || undefined,
      });

      if (!response.ok) {
        try {
          const data = await response.json();
          throw new Error(data.message || 'Failed to assign task');
        } catch (parseError) {
          throw new Error('Failed to assign task');
        }
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign task');
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 'configure') {
    const selectedTaskTypeName = taskTypes.find((t) => t.type === selectedType)?.name || 'Task';

    return (
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title-step2"
        >
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 id="modal-title-step2" className="text-xl font-semibold">
              Assign Task - Configure {selectedTaskTypeName}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Configure task for {memberName}
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="px-6 py-6 space-y-6">
              {/* Template Selector */}
              <div>
                <label htmlFor="template" className="block text-sm font-medium text-gray-700 mb-2">
                  Task Template
                </label>
                {loadingTemplates ? (
                  <div className="text-sm text-gray-500">Loading templates...</div>
                ) : (
                  <select
                    id="template"
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a template or create custom</option>
                    <option value="custom">Create custom task</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.title} - {template.category}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Title */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter task title"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter task description"
                  required
                />
              </div>

              {/* Due Date */}
              <div>
                <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date (Optional)
                </label>
                <input
                  type="date"
                  id="dueDate"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="priority"
                      value="low"
                      checked={priority === 'low'}
                      onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
                      className="mr-2"
                    />
                    Low
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="priority"
                      value="medium"
                      checked={priority === 'medium'}
                      onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
                      className="mr-2"
                    />
                    Medium
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="priority"
                      value="high"
                      checked={priority === 'high'}
                      onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
                      className="mr-2"
                    />
                    High
                  </label>
                </div>
              </div>

              {/* Counselor Notes */}
              <div>
                <label htmlFor="counselorNotes" className="block text-sm font-medium text-gray-700 mb-2">
                  Private Counselor Notes (Optional)
                </label>
                <textarea
                  id="counselorNotes"
                  value={counselorNotes}
                  onChange={(e) => setCounselorNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Internal notes for your reference (not visible to member)"
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex gap-2 justify-end">
              <button
                type="button"
                onClick={handleBack}
                disabled={submitting}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Back
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !title.trim() || !description.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Assigning...' : 'Assign Task'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title-step1"
      >
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 id="modal-title-step1" className="text-xl font-semibold">Assign Task - Step 1</h2>
          <p className="text-sm text-gray-600 mt-1">
            Select task type for {memberName}
          </p>
        </div>

        <div className="px-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {taskTypes.map((taskType) => (
              <button
                type="button"
                key={taskType.type}
                onClick={() => handleTypeSelect(taskType.type)}
                className="flex flex-col items-start p-6 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
              >
                <div className="text-4xl mb-3">{taskType.icon}</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {taskType.name}
                </h3>
                <p className="text-sm text-gray-600 mb-3">{taskType.description}</p>
                <p className="text-xs text-gray-500">
                  <span className="font-medium">Examples:</span> {taskType.examples}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
