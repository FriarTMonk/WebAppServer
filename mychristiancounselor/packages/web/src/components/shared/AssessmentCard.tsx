'use client';

import { AssessedAssessment } from '@/lib/api';

interface AssessmentCardProps {
  assessment: AssessedAssessment;
  showActions?: boolean;
  onTakeAssessment?: (assessment: AssessedAssessment) => void;
  onViewHistory?: (assessment: AssessedAssessment) => void;
}

export function AssessmentCard({
  assessment,
  showActions = false,
  onTakeAssessment,
  onViewHistory,
}: AssessmentCardProps) {
  const getAssessmentName = (type: string) => {
    return type === 'phq9' ? 'PHQ-9 (Depression)' : 'GAD-7 (Anxiety)';
  };

  const getStatusBadge = (status: string) => {
    if (status === 'completed') {
      return <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">Completed</span>;
    }
    return <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">Pending</span>;
  };

  const getSeverityBadge = (severity?: string) => {
    if (!severity) return null;

    const colors: Record<string, string> = {
      minimal: 'bg-green-100 text-green-800',
      mild: 'bg-yellow-100 text-yellow-800',
      moderate: 'bg-orange-100 text-orange-800',
      'moderately severe': 'bg-red-100 text-red-800',
      severe: 'bg-red-200 text-red-900',
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[severity.toLowerCase()] || 'bg-gray-100 text-gray-800'}`}>
        {severity}
      </span>
    );
  };

  const formatDate = (date?: string) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="border border-gray-300 rounded-lg p-4 bg-white">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold text-gray-900 mb-1">
            {getAssessmentName(assessment.type)}
          </h4>
          <div className="flex items-center gap-2">
            {getStatusBadge(assessment.status)}
            {assessment.score !== undefined && (
              <span className="text-sm font-medium text-gray-700">
                Score: {assessment.score}
              </span>
            )}
            {assessment.severity && getSeverityBadge(assessment.severity)}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
        <span>Assigned: {formatDate(assessment.assignedAt)}</span>
        {assessment.dueDate && <span>Due: {formatDate(assessment.dueDate)}</span>}
        {assessment.completedAt && (
          <span className="text-green-600">
            Completed: {formatDate(assessment.completedAt)}
          </span>
        )}
      </div>

      {assessment.noteToMember && (
        <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-gray-700">
          <span className="font-medium">Note:</span> {assessment.noteToMember}
        </div>
      )}

      {showActions && (
        <div className="flex gap-2 mt-4">
          {assessment.status === 'pending' && onTakeAssessment && (
            <button
              onClick={() => onTakeAssessment(assessment)}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Take Assessment
            </button>
          )}
          {onViewHistory && (
            <button
              onClick={() => onViewHistory(assessment)}
              className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200"
            >
              View History
            </button>
          )}
        </div>
      )}
    </div>
  );
}
