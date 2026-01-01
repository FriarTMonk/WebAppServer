'use client';

import { useState, useEffect } from 'react';
import { AssessmentType, assessmentApi, assessmentLibraryApi } from '@/lib/api';
import { CustomAssessment } from '@/types/assessment';
import AssessmentBuilderModal from './AssessmentBuilderModal';

interface AssignAssessmentModalProps {
  memberName: string;
  memberId: string;
  onClose: () => void;
  onSuccess: () => void;
}

type AssessmentCategory = 'Clinical' | 'Custom';

// Clinical assessment types - moved outside component to avoid recreating on every render
const clinicalAssessments = [
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
  const [assessmentCategory, setAssessmentCategory] = useState<AssessmentCategory>('Clinical');
  const [selectedClinicalType, setSelectedClinicalType] = useState<AssessmentType>('phq9');
  const [selectedCustomId, setSelectedCustomId] = useState<string>('');
  const [dueDate, setDueDate] = useState('');
  const [noteToMember, setNoteToMember] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Custom assessments state
  const [customAssessments, setCustomAssessments] = useState<CustomAssessment[]>([]);
  const [loadingCustom, setLoadingCustom] = useState(false);
  const [showBuilderModal, setShowBuilderModal] = useState(false);
  const [builderType, setBuilderType] = useState<'custom_assessment' | 'custom_questionnaire'>('custom_assessment');

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !showBuilderModal) onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose, showBuilderModal]);

  // Load custom assessments when category changes to Custom
  useEffect(() => {
    if (assessmentCategory === 'Custom') {
      loadCustomAssessments();
    }
  }, [assessmentCategory]);

  const loadCustomAssessments = async () => {
    setLoadingCustom(true);
    setError(null);
    try {
      const response = await assessmentLibraryApi.list();
      if (!response.ok) {
        throw new Error('Failed to load custom assessments');
      }
      const data = await response.json();
      setCustomAssessments(data.assessments || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load custom assessments');
    } finally {
      setLoadingCustom(false);
    }
  };

  const handleOpenBuilder = (type: 'custom_assessment' | 'custom_questionnaire') => {
    setBuilderType(type);
    setShowBuilderModal(true);
  };

  const handleBuilderSave = async (assessment: Partial<CustomAssessment>) => {
    try {
      const response = await assessmentLibraryApi.create({
        name: assessment.name!,
        type: assessment.type!,
        category: assessment.category,
        questions: assessment.questions!,
        scoringRules: assessment.scoringRules,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to create assessment');
      }

      const newAssessment = await response.json();

      // Reload custom assessments
      await loadCustomAssessments();

      // Auto-select the newly created assessment
      setSelectedCustomId(newAssessment.id);

      setShowBuilderModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create assessment');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      let response;

      if (assessmentCategory === 'Clinical') {
        // Assign clinical assessment
        response = await assessmentApi.assign({
          memberId,
          type: selectedClinicalType,
          dueDate: dueDate || undefined,
          noteToMember: noteToMember.trim() || undefined,
        });
      } else {
        // Assign custom assessment
        if (!selectedCustomId) {
          setError('Please select a custom assessment');
          setSubmitting(false);
          return;
        }

        // TODO: API endpoint for assigning custom assessments
        // For now, use a placeholder
        throw new Error('Custom assessment assignment endpoint not yet implemented');
      }

      if (!response.ok) {
        let errorMessage = 'Failed to assign assessment';
        try {
          const data = await response.json();
          errorMessage = data.message || errorMessage;
        } catch {
          // Use default message
        }
        throw new Error(errorMessage);
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
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col"
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

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
            <div className="px-6 py-4">
              {/* Assessment Category Selector */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assessment Type <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAssessmentCategory('Clinical')}
                    className={`flex-1 px-4 py-2 border-2 rounded transition-colors ${
                      assessmentCategory === 'Clinical'
                        ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    Clinical
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssessmentCategory('Custom')}
                    className={`flex-1 px-4 py-2 border-2 rounded transition-colors ${
                      assessmentCategory === 'Custom'
                        ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    Custom
                  </button>
                </div>
              </div>

              {/* Clinical Assessments */}
              {assessmentCategory === 'Clinical' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Select Clinical Assessment <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-3">
                    {clinicalAssessments.map((assessment) => (
                      <label
                        key={assessment.type}
                        className={`flex items-start p-3 border-2 rounded cursor-pointer transition-colors ${
                          selectedClinicalType === assessment.type
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <input
                          type="radio"
                          name="clinical-assessment"
                          value={assessment.type}
                          checked={selectedClinicalType === assessment.type}
                          onChange={(e) => setSelectedClinicalType(e.target.value as AssessmentType)}
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
              )}

              {/* Custom Assessments */}
              {assessmentCategory === 'Custom' && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Select Custom Assessment <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenBuilder('custom_assessment')}
                        className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        + Create Assessment
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenBuilder('custom_questionnaire')}
                        className="text-sm px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        + Create Questionnaire
                      </button>
                    </div>
                  </div>

                  {loadingCustom ? (
                    <div className="text-center py-8 text-gray-500">
                      Loading custom assessments...
                    </div>
                  ) : customAssessments.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No custom assessments found. Click &quot;Create Assessment&quot; or &quot;Create Questionnaire&quot; to get started.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {customAssessments.map((assessment) => (
                        <label
                          key={assessment.id}
                          className={`flex items-start p-3 border-2 rounded cursor-pointer transition-colors ${
                            selectedCustomId === assessment.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          <input
                            type="radio"
                            name="custom-assessment"
                            value={assessment.id}
                            checked={selectedCustomId === assessment.id}
                            onChange={(e) => setSelectedCustomId(e.target.value)}
                            className="mt-1 mr-3"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">{assessment.name}</span>
                              <span
                                className={`text-xs px-2 py-0.5 rounded ${
                                  assessment.type === 'custom_assessment'
                                    ? 'bg-purple-100 text-purple-700'
                                    : 'bg-green-100 text-green-700'
                                }`}
                              >
                                {assessment.type === 'custom_assessment' ? 'Assessment' : 'Questionnaire'}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              {assessment.questions.length} question{assessment.questions.length !== 1 ? 's' : ''}
                              {assessment.category && ` • ${assessment.category}`}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

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
            </div>

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
                disabled={submitting || (assessmentCategory === 'Custom' && !selectedCustomId)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {submitting ? 'Assigning...' : 'Assign Assessment'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Assessment Builder Modal */}
      {showBuilderModal && (
        <AssessmentBuilderModal
          type={builderType}
          onSave={handleBuilderSave}
          onClose={() => setShowBuilderModal(false)}
        />
      )}
    </>
  );
}
