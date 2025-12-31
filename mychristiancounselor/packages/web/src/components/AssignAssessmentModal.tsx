'use client';

import { useState, useEffect } from 'react';
import { AssessmentType, assessmentApi } from '@/lib/api';

interface AssignAssessmentModalProps {
  memberName: string;
  memberId: string;
  onClose: () => void;
  onSuccess: () => void;
}

// Assessment type definitions - moved outside component to avoid recreating on every render
const assessmentTypes = [
  {
    type: 'phq9' as AssessmentType,
    name: 'PHQ-9 (Depression Screening)',
    description: '9-item questionnaire measuring depression severity',
  },
  {
    type: 'gad7' as AssessmentType,
    name: 'GAD-7 (Anxiety Screening)',
    description: '7-item questionnaire measuring anxiety severity',
  },
];

export default function AssignAssessmentModal({
  memberName,
  memberId,
  onClose,
  onSuccess,
}: AssignAssessmentModalProps) {
  const [selectedType, setSelectedType] = useState<AssessmentType>('phq9');
  const [dueDate, setDueDate] = useState('');
  const [noteToMember, setNoteToMember] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle Escape key to close modal
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await assessmentApi.assign({
        memberId,
        type: selectedType,
        dueDate: dueDate || undefined,
        noteToMember: noteToMember.trim() || undefined,
      });

      if (!response.ok) {
        try {
          const data = await response.json();
          throw new Error(data.message || 'Failed to assign assessment');
        } catch (parseError) {
          throw new Error('Failed to assign assessment');
        }
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign assessment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 id="modal-title" className="text-xl font-semibold">
            Assign Assessment
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Assign assessment to {memberName}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4">
          {/* Assessment Type */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Assessment Type <span className="text-red-500">*</span>
            </label>
            <div className="space-y-3">
              {assessmentTypes.map((assessment) => (
                <label
                  key={assessment.type}
                  className={`flex items-start p-3 border-2 rounded cursor-pointer transition-colors ${
                    selectedType === assessment.type
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="assessment-type"
                    value={assessment.type}
                    checked={selectedType === assessment.type}
                    onChange={(e) => setSelectedType(e.target.value as AssessmentType)}
                    className="mt-1 mr-3"
                  />
                  <div>
                    <div className="font-medium text-gray-900">{assessment.name}</div>
                    <div className="text-sm text-gray-600">{assessment.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Due Date */}
          <div className="mb-4">
            <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-2">
              Due Date (Optional)
            </label>
            <input
              type="date"
              id="dueDate"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* Note to Member */}
          <div className="mb-4">
            <label htmlFor="noteToMember" className="block text-sm font-medium text-gray-700 mb-2">
              Note to Member (Optional)
            </label>
            <textarea
              id="noteToMember"
              value={noteToMember}
              onChange={(e) => setNoteToMember(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Please complete before our next session"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {error}
            </div>
          )}
        </form>

        <div className="px-6 py-4 border-t border-gray-200 flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {submitting ? 'Assigning...' : 'Assign Assessment'}
          </button>
        </div>
      </div>
    </div>
  );
}
