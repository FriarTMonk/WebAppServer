'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '../../../../components/AdminLayout';
import { BackButton } from '@/components/BackButton';
import { Breadcrumbs } from '@/components/Breadcrumbs';

interface EvaluationFramework {
  id: string;
  version: string;
  criteria: Record<string, any>;
  categoryWeights: Record<string, number>;
  thresholds: Record<string, number>;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  activatedAt: string | null;
}

export default function EvaluationFrameworksPage() {
  const router = useRouter();
  const [frameworks, setFrameworks] = useState<EvaluationFramework[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFramework, setSelectedFramework] = useState<EvaluationFramework | null>(null);

  useEffect(() => {
    fetchFrameworks();
  }, []);

  const fetchFrameworks = async () => {
    try {
      setLoading(true);
      setError(null);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';
      const response = await fetch(`${apiUrl}/admin/evaluation/frameworks`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          router.push('/login?redirect=/admin/evaluation/frameworks');
          return;
        }
        throw new Error('Failed to fetch frameworks');
      }

      const data = await response.json();
      setFrameworks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching frameworks:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleActivateFramework = async (frameworkId: string) => {
    if (!confirm('Are you sure you want to activate this framework version? This will affect all future book evaluations.')) {
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';
      const response = await fetch(`${apiUrl}/admin/evaluation/frameworks/${frameworkId}/activate`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to activate framework');
      }

      await fetchFrameworks();
      alert('Framework activated successfully!');
    } catch (err) {
      alert(`Failed to activate framework: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleViewDetails = (framework: EvaluationFramework) => {
    setSelectedFramework(framework);
  };

  return (
    <AdminLayout>
      <div>
        <Breadcrumbs />
        <BackButton />
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-gray-900">Evaluation Frameworks</h2>
          <button
            onClick={() => router.push('/admin/evaluation/frameworks/new')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create New Framework
          </button>
        </div>

        {loading && (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading frameworks...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">Error: {error}</p>
            <button
              onClick={fetchFrameworks}
              className="mt-2 text-sm text-red-600 hover:underline"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Version
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Activated
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {frameworks.map((framework) => (
                  <tr key={framework.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{framework.version}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {framework.isActive ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(framework.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {framework.activatedAt ? new Date(framework.activatedAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleViewDetails(framework)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        View Details
                      </button>
                      {!framework.isActive && (
                        <button
                          onClick={() => handleActivateFramework(framework.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Activate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {frameworks.length === 0 && !loading && (
              <div className="text-center py-12">
                <p className="text-gray-500">No frameworks found</p>
              </div>
            )}
          </div>
        )}

        {/* Framework Details Modal */}
        {selectedFramework && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-2xl font-bold">Framework Version {selectedFramework.version}</h3>
                  <button
                    onClick={() => setSelectedFramework(null)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <span className="text-2xl">&times;</span>
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <h4 className="text-lg font-semibold mb-2">Category Weights</h4>
                    <div className="bg-gray-50 p-4 rounded">
                      <pre className="text-sm overflow-x-auto">
                        {JSON.stringify(selectedFramework.categoryWeights, null, 2)}
                      </pre>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-semibold mb-2">Criteria</h4>
                    <div className="bg-gray-50 p-4 rounded">
                      <pre className="text-sm overflow-x-auto">
                        {JSON.stringify(selectedFramework.criteria, null, 2)}
                      </pre>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-semibold mb-2">Thresholds</h4>
                    <div className="bg-gray-50 p-4 rounded">
                      <pre className="text-sm overflow-x-auto">
                        {JSON.stringify(selectedFramework.thresholds, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setSelectedFramework(null)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
