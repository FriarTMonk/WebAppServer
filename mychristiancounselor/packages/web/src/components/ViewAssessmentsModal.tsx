'use client';

import { useState, useEffect, useCallback } from 'react';
import { AssessedAssessment, AssessmentHistoryItem, AssessmentType, assessmentApi } from '@/lib/api';
import { AssessmentCard } from './shared/AssessmentCard';

interface ViewAssessmentsModalProps {
  memberName: string;
  memberId: string;
  onClose: () => void;
}

export default function ViewAssessmentsModal({
  memberName,
  memberId,
  onClose,
}: ViewAssessmentsModalProps) {
  const [assessments, setAssessments] = useState<AssessedAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({});
  const [historyData, setHistoryData] = useState<Record<string, AssessmentHistoryItem[]>>({});
  const [loadingHistory, setLoadingHistory] = useState<Record<string, boolean>>({});
  const [historyError, setHistoryError] = useState<Record<string, string>>({});

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAssessments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await assessmentApi.getMemberAssessments(memberId);
      if (!response.ok) {
        let errorMessage = 'Failed to load assessments';
        try {
          const data = await response.json();
          errorMessage = data.message || errorMessage;
        } catch {
          // Use default message
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setAssessments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assessments');
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    fetchAssessments();
  }, [fetchAssessments]);

  const toggleHistory = async (assessmentId: string, type: AssessmentType) => {
    const isExpanded = expandedHistory[assessmentId];

    if (isExpanded) {
      setExpandedHistory((prev) => ({ ...prev, [assessmentId]: false }));
    } else {
      setExpandedHistory((prev) => ({ ...prev, [assessmentId]: true }));

      // Fetch history if not already loaded
      if (!historyData[assessmentId]) {
        setLoadingHistory((prev) => ({ ...prev, [assessmentId]: true }));
        setHistoryError((prev) => {
          const newState = { ...prev };
          delete newState[assessmentId];
          return newState;
        });
        try {
          const response = await assessmentApi.getAssessmentHistory(memberId, type);
          if (!response.ok) {
            let errorMessage = 'Failed to load assessment history';
            try {
              const data = await response.json();
              errorMessage = data.message || errorMessage;
            } catch {
              // Use default message
            }
            throw new Error(errorMessage);
          }

          const data = await response.json();
          setHistoryData((prev) => ({ ...prev, [assessmentId]: data }));
        } catch (err) {
          setHistoryError((prev) => ({
            ...prev,
            [assessmentId]: err instanceof Error ? err.message : 'Failed to load history'
          }));
        } finally {
          setLoadingHistory((prev) => ({ ...prev, [assessmentId]: false }));
        }
      }
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getTrendArrow = (current: number, previous: number) => {
    if (current > previous) return '↑';
    if (current < previous) return '↓';
    return '→';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 id="modal-title" className="text-xl font-semibold">Assessments for {memberName}</h2>
          <p className="text-sm text-gray-600 mt-1">
            View assessment history and scores
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
            <div className="text-center text-gray-500 py-8">
              No assessments assigned yet
            </div>
          ) : (
            <div className="space-y-4">
              {assessments.map((assessment) => (
                <div key={assessment.id} className="mb-4">
                  <AssessmentCard assessment={assessment} showActions={false} />

                  {/* View History Button */}
                  {assessment.status === 'completed' && (
                    <button
                      type="button"
                      onClick={() => toggleHistory(assessment.id, assessment.type)}
                      className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
                      aria-expanded={expandedHistory[assessment.id]}
                      aria-controls={`history-${assessment.id}`}
                    >
                      {expandedHistory[assessment.id] ? 'Hide History ▲' : 'View History ▼'}
                    </button>
                  )}

                  {/* History Timeline */}
                  {expandedHistory[assessment.id] && (
                    <div id={`history-${assessment.id}`} className="mt-4 pl-4 border-l-2 border-gray-300">
                      {loadingHistory[assessment.id] ? (
                        <div className="text-sm text-gray-500">Loading history...</div>
                      ) : historyError[assessment.id] ? (
                        <div className="text-sm text-red-600">{historyError[assessment.id]}</div>
                      ) : historyData[assessment.id]?.length > 0 ? (
                        <div className="space-y-2">
                          {historyData[assessment.id].slice(0, 5).map((item, index, array) => (
                            <div key={item.id} className="text-sm">
                              <span className="text-gray-600">{formatDate(item.completedAt)}</span>
                              <span className="mx-2">•</span>
                              <span className="font-medium">Score: {item.score}</span>
                              <span className="mx-2">•</span>
                              <span className="text-gray-700">{item.severity}</span>
                              {index < array.length - 1 && (
                                <span className="ml-2 text-gray-400">
                                  {getTrendArrow(item.score, array[index + 1].score)}
                                </span>
                              )}
                            </div>
                          ))}
                          {historyData[assessment.id].length > 5 && (
                            <div className="text-xs text-gray-500 italic">
                              Showing 5 most recent. View Historical Trends for full history.
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">No previous assessments</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
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
