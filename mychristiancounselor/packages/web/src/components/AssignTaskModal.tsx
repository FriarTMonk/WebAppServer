'use client';

import { useState, useEffect } from 'react';
import { TaskType } from '@/lib/api';

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

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleTypeSelect = (type: TaskType) => {
    setSelectedType(type);
    setStep('configure');
  };

  if (step === 'configure') {
    // Step 2 will be implemented in next task
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
            <h2 id="modal-title-step2" className="text-xl font-semibold">Assign Task - Step 2</h2>
            <p className="text-sm text-gray-600 mt-1">
              Configure task for {memberName}
            </p>
          </div>
          <div className="px-6 py-4">
            <p>Step 2 configuration (to be implemented)</p>
            <p>Selected type: {selectedType}</p>
          </div>
          <div className="px-6 py-4 border-t border-gray-200 flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setStep('select_type')}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
            >
              Back
            </button>
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
