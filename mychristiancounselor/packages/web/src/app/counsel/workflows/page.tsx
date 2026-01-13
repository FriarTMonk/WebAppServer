'use client';

import { useState, useEffect } from 'react';
import { WorkflowWizard } from '@/components/workflow';
import { showToast } from '@/components/Toast';

interface Workflow {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  trigger: any;
  actions: any[];
  createdAt: string;
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [organizationId, setOrganizationId] = useState<string>('');

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    try {
      const response = await fetch('/api/counsel/workflows', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await response.json();
      setWorkflows(data.workflows || []);

      // Assume user's organization ID is returned or available in user context
      if (data.organizationId) {
        setOrganizationId(data.organizationId);
      }
    } catch (error) {
      showToast('Failed to load workflows', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (workflowId: string, isActive: boolean) => {
    try {
      await fetch(`/api/counsel/workflows/${workflowId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ isActive }),
      });
      showToast(`Workflow ${isActive ? 'activated' : 'deactivated'}`, 'success');
      fetchWorkflows();
    } catch (error) {
      showToast('Failed to update workflow', 'error');
    }
  };

  const handleDelete = async (workflowId: string) => {
    if (!confirm('Are you sure you want to delete this workflow?')) {
      return;
    }

    try {
      await fetch(`/api/counsel/workflows/${workflowId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      showToast('Workflow deleted', 'success');
      fetchWorkflows();
    } catch (error) {
      showToast('Failed to delete workflow', 'error');
    }
  };

  if (showWizard) {
    return (
      <div className="p-6">
        <WorkflowWizard
          organizationId={organizationId}
          onClose={() => {
            setShowWizard(false);
            fetchWorkflows();
          }}
        />
      </div>
    );
  }

  if (loading) {
    return <div className="p-6">Loading workflows...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Workflow Automation Rules</h1>
          <p className="text-sm text-gray-600 mt-1">
            Automate actions based on member activity and assessments
          </p>
        </div>
        <button
          onClick={() => setShowWizard(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Create Workflow
        </button>
      </div>

      {workflows.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600 mb-4">No workflows created yet.</p>
          <button
            onClick={() => setShowWizard(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Create Your First Workflow
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Trigger
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {workflows.map((workflow) => (
                <tr key={workflow.id}>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {workflow.name}
                    </div>
                    {workflow.description && (
                      <div className="text-sm text-gray-500">
                        {workflow.description}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {workflow.trigger?.event || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {workflow.actions?.length || 0} actions
                  </td>
                  <td className="px-6 py-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={workflow.isActive}
                        onChange={(e) => handleToggleActive(workflow.id, e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="ml-2 text-sm">
                        {workflow.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </label>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <button
                      onClick={() => handleDelete(workflow.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
