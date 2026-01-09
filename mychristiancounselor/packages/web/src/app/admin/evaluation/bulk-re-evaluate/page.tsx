'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '../../../../components/AdminLayout';

interface Framework {
  id: string;
  version: string;
  isActive: boolean;
}

interface EstimateResponse {
  bookCount: number;
  estimatedCost: number;
  estimatedTimeMinutes: number;
}

export default function BulkReEvaluatePage() {
  const router = useRouter();
  const [frameworks, setFrameworks] = useState<Framework[]>([]);
  const [selectedFramework, setSelectedFramework] = useState<string>('');
  const [scope, setScope] = useState<'all' | 'pending' | 'aligned' | 'not_aligned'>('all');
  const [estimate, setEstimate] = useState<EstimateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [triggeringJob, setTriggeringJob] = useState(false);

  useEffect(() => {
    fetchFrameworks();
  }, []);

  const fetchFrameworks = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';
      const response = await fetch(`${apiUrl}/admin/evaluation/frameworks`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch frameworks');
      }

      const data = await response.json();
      const frameworksList = Array.isArray(data) ? data : [];
      setFrameworks(frameworksList);

      // Auto-select active framework
      const active = frameworksList.find((fw: Framework) => fw.isActive);
      if (active) {
        setSelectedFramework(active.id);
      }
    } catch (err) {
      console.error('Error fetching frameworks:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const fetchEstimate = async () => {
    if (!selectedFramework) {
      setError('Please select a framework');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';
      const response = await fetch(`${apiUrl}/admin/evaluation/re-evaluate/estimate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          frameworkId: selectedFramework,
          scope,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch estimate');
      }

      const data = await response.json();
      setEstimate(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerReEvaluation = async () => {
    if (!estimate) {
      setError('Please get an estimate first');
      return;
    }

    const confirmMessage =
      `Are you sure you want to trigger bulk re-evaluation?\n\n` +
      `Books to evaluate: ${estimate.bookCount}\n` +
      `Estimated cost: $${estimate.estimatedCost.toFixed(2)}\n` +
      `Estimated time: ${estimate.estimatedTimeMinutes} minutes\n\n` +
      `This will queue ${estimate.bookCount} evaluation jobs.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      setTriggeringJob(true);
      setError(null);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';
      const response = await fetch(`${apiUrl}/admin/evaluation/re-evaluate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          frameworkId: selectedFramework,
          scope,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to trigger re-evaluation');
      }

      const data = await response.json();
      alert(
        `Re-evaluation triggered successfully!\n\n` +
        `Books queued: ${data.bookCount}\n` +
        `Estimated cost: $${data.estimatedCost.toFixed(2)}\n\n` +
        `Monitor progress in the Queue page.`
      );

      router.push('/admin/evaluation/queue');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setTriggeringJob(false);
    }
  };

  const getScopeDescription = (scope: string) => {
    switch (scope) {
      case 'all':
        return 'All books in the database';
      case 'pending':
        return 'Only books with evaluationStatus = "pending"';
      case 'aligned':
        return 'Only books with visibilityTier = "aligned" or "highly_aligned"';
      case 'not_aligned':
        return 'Only books with visibilityTier = "not_aligned"';
      default:
        return '';
    }
  };

  return (
    <AdminLayout>
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Bulk Re-Evaluation</h2>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Warning</h3>
              <p className="mt-1 text-sm text-yellow-700">
                Bulk re-evaluation will queue multiple AI evaluation jobs. This operation can be expensive and time-consuming.
                Always get an estimate first before proceeding.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-xl font-semibold mb-4">Configuration</h3>

          <div className="space-y-6">
            {/* Framework Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Evaluation Framework
              </label>
              <select
                value={selectedFramework}
                onChange={(e) => setSelectedFramework(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Select a framework...</option>
                {frameworks.map((fw) => (
                  <option key={fw.id} value={fw.id}>
                    {fw.version} {fw.isActive ? '(Active)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Scope Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Scope
              </label>
              <div className="space-y-2">
                {(['all', 'pending', 'aligned', 'not_aligned'] as const).map((scopeOption) => (
                  <div key={scopeOption} className="flex items-center">
                    <input
                      type="radio"
                      id={`scope-${scopeOption}`}
                      name="scope"
                      value={scopeOption}
                      checked={scope === scopeOption}
                      onChange={(e) => setScope(e.target.value as any)}
                      className="h-4 w-4 text-blue-600 border-gray-300"
                    />
                    <label htmlFor={`scope-${scopeOption}`} className="ml-3">
                      <span className="block text-sm font-medium text-gray-900">
                        {scopeOption.replace('_', ' ').charAt(0).toUpperCase() + scopeOption.slice(1).replace('_', ' ')}
                      </span>
                      <span className="block text-sm text-gray-500">
                        {getScopeDescription(scopeOption)}
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Get Estimate Button */}
            <div>
              <button
                onClick={fetchEstimate}
                disabled={loading || !selectedFramework}
                className={`w-full px-4 py-2 rounded-lg font-medium ${
                  loading || !selectedFramework
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {loading ? 'Calculating...' : 'Get Estimate'}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">Error: {error}</p>
          </div>
        )}

        {/* Estimate Results */}
        {estimate && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-xl font-semibold mb-4">Estimate</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Books to Evaluate</p>
                <p className="text-3xl font-bold text-blue-800">{estimate.bookCount}</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Estimated Cost</p>
                <p className="text-3xl font-bold text-green-800">${estimate.estimatedCost.toFixed(2)}</p>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Estimated Time</p>
                <p className="text-3xl font-bold text-purple-800">{estimate.estimatedTimeMinutes}m</p>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
              <h4 className="font-semibold text-gray-900 mb-2">What happens next:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                <li>{estimate.bookCount} evaluation jobs will be added to the queue</li>
                <li>Jobs will be processed sequentially by the queue worker</li>
                <li>You can monitor progress in the Queue page</li>
                <li>Books will be re-evaluated with the selected framework</li>
                <li>Evaluation scores and visibility tiers will be updated</li>
              </ul>
            </div>

            <button
              onClick={handleTriggerReEvaluation}
              disabled={triggeringJob}
              className={`w-full px-4 py-2 rounded-lg font-medium ${
                triggeringJob
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              {triggeringJob ? 'Triggering...' : 'Trigger Bulk Re-Evaluation'}
            </button>
          </div>
        )}

        {/* Quick Links */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
          <div className="space-y-2">
            <button
              onClick={() => router.push('/admin/evaluation/queue')}
              className="w-full text-left px-4 py-2 text-blue-600 hover:bg-blue-50 rounded"
            >
              View Evaluation Queue →
            </button>
            <button
              onClick={() => router.push('/admin/evaluation/costs')}
              className="w-full text-left px-4 py-2 text-blue-600 hover:bg-blue-50 rounded"
            >
              View Cost Analytics →
            </button>
            <button
              onClick={() => router.push('/admin/evaluation/frameworks')}
              className="w-full text-left px-4 py-2 text-blue-600 hover:bg-blue-50 rounded"
            >
              Manage Frameworks →
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
