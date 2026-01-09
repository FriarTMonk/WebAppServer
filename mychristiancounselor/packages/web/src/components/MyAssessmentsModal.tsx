'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AssessedAssessment, assessmentApi } from '@/lib/api';
import { AssessmentCard } from './shared/AssessmentCard';
import { parseErrorMessage } from '@/lib/error-utils';

interface MyAssessmentsModalProps {
  onClose: () => void;
  onAssessmentUpdate?: () => void;
}

export default function MyAssessmentsModal({ onClose, onAssessmentUpdate }: MyAssessmentsModalProps) {
  const router = useRouter();
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

  const handleTakeAssessment = (assessment: AssessedAssessment) => {
    router.push(`/assessments/take/${assessment.id}`);
    onClose();
  };

  const pendingAssessments = useMemo(() => assessments.filter((a) => a.status === 'pending'), [assessments]);
  const completedAssessments = useMemo(() => assessments.filter((a) => a.status === 'completed'), [assessments]);


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
                  <h3 className="text-lg font-semibold text-yellow-600 mb-3">
                    Pending ({pendingAssessments.length})
                  </h3>
                  <div className="space-y-3">
                    {pendingAssessments.map((assessment) => (
                      <AssessmentCard
                        key={assessment.id}
                        assessment={assessment}
                        showActions={true}
                        onTakeAssessment={handleTakeAssessment}
                      />
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
                      <AssessmentCard
                        key={assessment.id}
                        assessment={assessment}
                      />
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
