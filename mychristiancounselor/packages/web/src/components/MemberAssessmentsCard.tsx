'use client';

import { useState, useEffect, useCallback } from 'react';
import { AssessedAssessment, assessmentApi } from '@/lib/api';
import { parseErrorMessage } from '@/lib/error-utils';

interface MemberAssessmentsCardProps {
  onOpenModal: () => void;
  refreshTrigger?: number;
}

export default function MemberAssessmentsCard({ onOpenModal, refreshTrigger }: MemberAssessmentsCardProps) {
  const [assessments, setAssessments] = useState<AssessedAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssessments = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);
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

  // Refetch when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      const abortController = new AbortController();
      fetchAssessments(abortController.signal);
      return () => abortController.abort();
    }
    return undefined;
  }, [refreshTrigger, fetchAssessments]);

  // Count pending assessments
  const pendingCount = assessments.filter((a) => a.status === 'pending').length;

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-2 text-red-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="text-sm">Unable to load assessments</span>
        </div>
      </div>
    );
  }

  if (pendingCount === 0) {
    return (
      <button
        onClick={onOpenModal}
        className="w-full bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">All Assessments Complete</p>
            <p className="text-xs text-gray-500">Great job!</p>
          </div>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onOpenModal}
      className="w-full bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer text-left"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-900">
              {pendingCount} {pendingCount === 1 ? 'Pending Assessment' : 'Pending Assessments'}
            </p>
            <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
              Action Needed
            </span>
          </div>
        </div>
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}
