'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  memberHistoryApi,
  MemberWellbeingHistoryItem,
  AssessmentHistoryItem,
} from '@/lib/api';

interface HistoricalTrendsModalProps {
  memberName: string;
  memberId: string;
  onClose: () => void;
}

// Event timeline type (not yet in api.ts)
interface MemberEvent {
  id: string;
  type: 'status_change' | 'task' | 'assessment' | 'workflow_rule' | 'override';
  timestamp: string;
  description: string;
  details?: string;
}

type TimeRange = 30 | 60 | 90;
type EventTypeFilter = 'all' | 'status_change' | 'task' | 'assessment' | 'workflow_rule' | 'override';

export default function HistoricalTrendsModal({
  memberName,
  memberId,
  onClose,
}: HistoricalTrendsModalProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>(90);
  const [wellbeingHistory, setWellbeingHistory] = useState<MemberWellbeingHistoryItem[]>([]);
  const [assessmentHistory, setAssessmentHistory] = useState<AssessmentHistoryItem[]>([]);
  const [eventTimeline, setEventTimeline] = useState<MemberEvent[]>([]);
  const [eventTypeFilter, setEventTypeFilter] = useState<EventTypeFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all data in parallel
      const [wellbeingResponse, assessmentResponse, eventsResponse] = await Promise.all([
        memberHistoryApi.getWellbeingHistory(memberId, timeRange),
        memberHistoryApi.getAssessmentHistory(memberId),
        memberHistoryApi.getEventTimeline(memberId),
      ]);

      // Handle wellbeing history response
      if (!wellbeingResponse.ok) {
        let errorMessage = 'Failed to load wellbeing history';
        try {
          const data = await wellbeingResponse.json();
          errorMessage = data.message || errorMessage;
        } catch {
          // Use default message
        }
        throw new Error(errorMessage);
      }

      // Handle assessment history response
      if (!assessmentResponse.ok) {
        let errorMessage = 'Failed to load assessment history';
        try {
          const data = await assessmentResponse.json();
          errorMessage = data.message || errorMessage;
        } catch {
          // Use default message
        }
        throw new Error(errorMessage);
      }

      // Handle events response
      if (!eventsResponse.ok) {
        let errorMessage = 'Failed to load event timeline';
        try {
          const data = await eventsResponse.json();
          errorMessage = data.message || errorMessage;
        } catch {
          // Use default message
        }
        throw new Error(errorMessage);
      }

      const wellbeingData = await wellbeingResponse.json();
      const assessmentData = await assessmentResponse.json();
      const eventsData = await eventsResponse.json();

      setWellbeingHistory(wellbeingData);
      setAssessmentHistory(assessmentData);
      setEventTimeline(eventsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load historical trends');
    } finally {
      setLoading(false);
    }
  }, [memberId, timeRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      thriving: 'Thriving',
      stable: 'Stable',
      at_risk: 'At Risk',
      high_concern: 'High Concern',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      thriving: 'text-green-700 bg-green-100',
      stable: 'text-blue-700 bg-blue-100',
      at_risk: 'text-yellow-700 bg-yellow-100',
      high_concern: 'text-red-700 bg-red-100',
    };
    return colors[status] || 'text-gray-700 bg-gray-100';
  };

  const getSeverityLabel = (severity: string) => {
    const labels: Record<string, string> = {
      minimal: 'Minimal',
      mild: 'Mild',
      moderate: 'Moderate',
      moderately_severe: 'Moderately Severe',
      severe: 'Severe',
    };
    return labels[severity] || severity;
  };

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      minimal: 'text-green-700 bg-green-100',
      mild: 'text-blue-700 bg-blue-100',
      moderate: 'text-yellow-700 bg-yellow-100',
      moderately_severe: 'text-orange-700 bg-orange-100',
      severe: 'text-red-700 bg-red-100',
    };
    return colors[severity] || 'text-gray-700 bg-gray-100';
  };

  const getEventTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      status_change: 'Status Change',
      task: 'Task',
      assessment: 'Assessment',
      workflow_rule: 'Workflow Rule',
      override: 'Override',
    };
    return labels[type] || type;
  };

  const getEventTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      status_change: 'border-purple-500',
      task: 'border-blue-500',
      assessment: 'border-green-500',
      workflow_rule: 'border-orange-500',
      override: 'border-red-500',
    };
    return colors[type] || 'border-gray-500';
  };

  const handleExportCSV = async () => {
    try {
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697') + '/v1';
      const token = localStorage.getItem('accessToken');

      const response = await fetch(
        `${apiUrl}/counsel/wellbeing/member/${memberId}/history/export`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error('Export failed');

      const { filename, data } = await response.json();

      // Create download
      const blob = new Blob([data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('CSV export failed:', error);
      alert('Failed to export CSV');
    }
  };

  // Filter events by type
  const filteredEvents = eventTypeFilter === 'all'
    ? eventTimeline
    : eventTimeline.filter(event => event.type === eventTypeFilter);

  // Group assessments by type for display
  const phq9Assessments = assessmentHistory.filter(a => a.type === 'phq9');
  const gad7Assessments = assessmentHistory.filter(a => a.type === 'gad7');

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 id="modal-title" className="text-xl font-semibold">
            Historical Trends for {memberName}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            View wellbeing status, assessment scores, and event timeline
          </p>
        </div>

        <div className="px-6 py-4">
          {loading ? (
            <div className="text-center text-gray-500 py-8">
              Loading historical trends...
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {error}
            </div>
          ) : (
            <>
              {/* Section 1: Wellbeing Status History */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Wellbeing Status History
                  </h3>
                  <div className="flex gap-2">
                    {([30, 60, 90] as TimeRange[]).map((days) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => setTimeRange(days)}
                        className={`px-3 py-1 text-sm rounded ${
                          timeRange === days
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {days} days
                      </button>
                    ))}
                  </div>
                </div>

                {wellbeingHistory.length === 0 ? (
                  <div className="text-center text-gray-500 py-6 bg-gray-50 rounded-lg">
                    No wellbeing status history in the selected time range
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Notes
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Overridden By
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {wellbeingHistory.map((item) => (
                          <tr key={item.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(item.recordedAt)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                                  item.status
                                )}`}
                              >
                                {getStatusLabel(item.status)}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700">
                              {item.notes || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                              {item.overriddenBy || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* TODO: Add chart visualization with charting library */}
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                  <strong>Note:</strong> Chart visualization will be added with a charting library (Recharts, Chart.js, etc.) in a future update.
                </div>
              </div>

              {/* Section 2: Assessment Score Trends */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Assessment Score Trends
                </h3>

                {assessmentHistory.length === 0 ? (
                  <div className="text-center text-gray-500 py-6 bg-gray-50 rounded-lg">
                    No assessment history available
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* PHQ-9 Scores */}
                    {phq9Assessments.length > 0 && (
                      <div>
                        <h4 className="text-lg font-medium text-gray-900 mb-3">
                          PHQ-9 (Depression Screening)
                        </h4>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Date
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Score
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Severity
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {phq9Assessments.map((item) => (
                                <tr key={item.id}>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {formatDate(item.completedAt)}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {item.score}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span
                                      className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(
                                        item.severity
                                      )}`}
                                    >
                                      {getSeverityLabel(item.severity)}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* GAD-7 Scores */}
                    {gad7Assessments.length > 0 && (
                      <div>
                        <h4 className="text-lg font-medium text-gray-900 mb-3">
                          GAD-7 (Anxiety Screening)
                        </h4>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Date
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Score
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Severity
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {gad7Assessments.map((item) => (
                                <tr key={item.id}>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {formatDate(item.completedAt)}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {item.score}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span
                                      className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(
                                        item.severity
                                      )}`}
                                    >
                                      {getSeverityLabel(item.severity)}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TODO: Add chart visualization with charting library */}
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                  <strong>Note:</strong> Line charts with severity zones will be added with a charting library in a future update.
                </div>
              </div>

              {/* Section 3: Event Timeline */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Event Timeline
                  </h3>
                  <div>
                    <label className="text-sm text-gray-700 mr-2">Filter:</label>
                    <select
                      value={eventTypeFilter}
                      onChange={(e) => setEventTypeFilter(e.target.value as EventTypeFilter)}
                      className="px-3 py-1 text-sm border border-gray-300 rounded"
                    >
                      <option value="all">All Events</option>
                      <option value="status_change">Status Changes</option>
                      <option value="task">Tasks</option>
                      <option value="assessment">Assessments</option>
                      <option value="workflow_rule">Workflow Rules</option>
                      <option value="override">Overrides</option>
                    </select>
                  </div>
                </div>

                {filteredEvents.length === 0 ? (
                  <div className="text-center text-gray-500 py-6 bg-gray-50 rounded-lg">
                    No events in timeline
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredEvents.map((event) => (
                      <div
                        key={event.id}
                        className={`border-l-4 pl-4 py-2 ${getEventTypeColor(event.type)}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium text-gray-500 uppercase">
                                {getEventTypeLabel(event.type)}
                              </span>
                              <span className="text-xs text-gray-400">
                                {formatDateTime(event.timestamp)}
                              </span>
                            </div>
                            <div className="font-medium text-gray-900 mb-1">
                              {event.description}
                            </div>
                            {event.details && (
                              <div className="text-sm text-gray-700">
                                {event.details}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex gap-2 justify-between">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-4 py-2 text-blue-700 border border-blue-300 rounded hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading || error !== null}
          >
            Export CSV
          </button>
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
