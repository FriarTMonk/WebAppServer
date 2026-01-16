'use client';

import { useState, useEffect } from 'react';
import { showToast } from '@/components/Toast';

interface ScheduledCampaign {
  id: string;
  name: string;
  scheduledFor: string;
  recipientCount: number;
}

interface ExecutionLog {
  id: string;
  name: string;
  status: 'sent' | 'failed';
  executedAt: string;
  recipientCount: number;
}

export default function ScheduledCampaignsPage() {
  const [scheduled, setScheduled] = useState<ScheduledCampaign[]>([]);
  const [executions, setExecutions] = useState<ExecutionLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [scheduledRes, executionsRes] = await Promise.all([
        fetch('/api/marketing/campaigns/scheduled', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }),
        fetch('/api/marketing/campaigns/execution-log?limit=50', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }),
      ]);

      const scheduledData = await scheduledRes.json();
      const executionsData = await executionsRes.json();

      setScheduled(scheduledData.campaigns || []);
      setExecutions(executionsData.executions || []);
    } catch (error) {
      showToast('Failed to load scheduled campaigns', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteNow = async (campaignId: string, campaignName: string) => {
    if (!confirm(`Execute "${campaignName}" immediately?`)) {
      return;
    }

    try {
      await fetch(`/api/marketing/campaigns/${campaignId}/execute`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      showToast('Campaign queued for immediate execution', 'success');
      // Refresh after a short delay
      setTimeout(fetchData, 2000);
    } catch (error) {
      showToast('Failed to execute campaign', 'error');
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Scheduled Campaigns</h1>

      {/* Upcoming Campaigns */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Upcoming (Next 24 Hours)</h2>
        {scheduled.length === 0 ? (
          <div className="bg-gray-50 border rounded-lg p-6 text-center text-gray-600">
            No campaigns scheduled for the next 24 hours
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Campaign Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Scheduled For
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Recipients
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {scheduled.map((campaign) => (
                  <tr key={campaign.id}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {campaign.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(campaign.scheduledFor).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {campaign.recipientCount}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => handleExecuteNow(campaign.id, campaign.name)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Execute Now
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Executions */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Recent Executions (Last 50)</h2>
        {executions.length === 0 ? (
          <div className="bg-gray-50 border rounded-lg p-6 text-center text-gray-600">
            No recent executions
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Campaign Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Executed At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Sent
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {executions.map((execution) => (
                  <tr key={execution.id}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {execution.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(execution.executedAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      {execution.status === 'sent' ? (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          ✓ Sent
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                          ✗ Failed
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {execution.recipientCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
