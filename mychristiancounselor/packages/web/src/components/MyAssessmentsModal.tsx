'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { AssessedAssessment, assessmentApi } from '@/lib/api';
import { AssessmentCard } from './shared/AssessmentCard';
import { showToast } from './Toast';
import { parseErrorMessage } from '@/lib/error-utils';

interface MyAssessmentsModalProps {
  onClose: () => void;
  onAssessmentUpdate?: () => void;
}

export default function MyAssessmentsModal({ onClose, onAssessmentUpdate }: MyAssessmentsModalProps) {
  const [assessments, setAssessments] = useState<AssessedAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Handle Escape key to close modal
  // onClose is intentionally omitted from deps as it's stable and we want to set up listener once
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAssessments = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const response = await assessmentApi.getMyAssessments();

      // Check if request was aborted
      if (signal?.aborted) return;

      if (!response.ok) {
        const errorMessage = await parseErrorMessage(response, 'Failed to load assessments');
        throw new Error(errorMessage);
      }
      const data = await response.json();

      // Check again before setting state
      if (signal?.aborted) return;

      setAssessments(data);
    } catch (err) {
      if (signal?.aborted) return;
      setError(err instanceof Error ? err.message : 'Failed to load assessments');
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const abortController = new AbortController();
    fetchAssessments(abortController.signal);
    return () => abortController.abort();
  }, [fetchAssessments]);

  const handleTakeAssessment = async (assessment: AssessedAssessment) => {
    // TODO: Implement assessment form modal/page navigation
    // For now, show a toast message
    showToast('Assessment form will be implemented in a future task', 'info');
  };

  const pendingAssessments = useMemo(() => assessments.filter((a) => a.status === 'pending'), [assessments]);
  const completedAssessments = useMemo(() => assessments.filter((a) => a.status === 'completed'), [assessments]);

  const getAssessmentDescription = (type: string) => {
    if (type === 'phq9') {
      return 'Patient Health Questionnaire - measures depression severity over the past 2 weeks';
    }
    return 'Generalized Anxiety Disorder assessment - measures anxiety severity over the past 2 weeks';
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 id="modal-title" className="text-xl font-semibold">
            My Assessments
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            View and complete your assigned assessments
          </p>
        </div>

        <div className="px-6 py-4">
          {loading ? (
            <div className="text-center text-gray-500 py-8">Loading assessments...</div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {error}
            </div>
          ) : assessments.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No assessments assigned</h3>
              <p className="mt-1 text-sm text-gray-500">
                Your counselor hasn't assigned any assessments yet.
              </p>
            </div>
          ) : (
            <>
              {/* Pending Assessments */}
              {pendingAssessments.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-lg font-semibold text-yellow-600">
                      Pending ({pendingAssessments.length})
                    </h3>
                    <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                      Action Needed
                    </span>
                  </div>
                  <div className="space-y-3">
                    {pendingAssessments.map((assessment) => (
                      <div key={assessment.id} className="border-2 border-yellow-300 rounded-lg p-4">
                        <div className="mb-3">
                          <h4 className="font-semibold text-gray-900 mb-1">
                            {assessment.type === 'phq9' ? 'PHQ-9 (Depression)' : 'GAD-7 (Anxiety)'}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {getAssessmentDescription(assessment.type)}
                          </p>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                          <span>Assigned: {new Date(assessment.assignedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}</span>
                          {assessment.dueDate && (
                            <span className="text-yellow-600 font-medium">
                              Due: {new Date(assessment.dueDate).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                          )}
                        </div>

                        {assessment.noteToMember && (
                          <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-gray-700">
                            <span className="font-medium">Note from your counselor:</span> {assessment.noteToMember}
                          </div>
                        )}

                        <button
                          onClick={() => handleTakeAssessment(assessment)}
                          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
                        >
                          Take Assessment
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Completed Assessments */}
              {completedAssessments.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Completed ({completedAssessments.length})
                  </h3>
                  <div className="space-y-3">
                    {completedAssessments.map((assessment) => (
                      <div key={assessment.id} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-1">
                              {assessment.type === 'phq9' ? 'PHQ-9 (Depression)' : 'GAD-7 (Anxiety)'}
                            </h4>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-700">
                                Score: {assessment.score}
                              </span>
                              {assessment.severity && (
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  assessment.severity.toLowerCase() === 'minimal' ? 'bg-green-100 text-green-800' :
                                  assessment.severity.toLowerCase() === 'mild' ? 'bg-yellow-100 text-yellow-800' :
                                  assessment.severity.toLowerCase() === 'moderate' ? 'bg-orange-100 text-orange-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {assessment.severity}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          {assessment.completedAt && (
                            <span className="text-green-600">
                              Completed: {new Date(assessment.completedAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
