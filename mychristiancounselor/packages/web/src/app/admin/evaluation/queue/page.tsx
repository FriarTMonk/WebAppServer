'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '../../../../components/AdminLayout';
import { BackButton } from '@/components/BackButton';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { BrowserNotifications } from '@/components/notifications/BrowserNotifications';
import { NotificationPermissionPrompt } from '@/components/notifications/NotificationPermissionPrompt';
import { useQueueNotifications } from '@/hooks/useQueueNotifications';
import { useAdaptivePolling } from '@/hooks/useAdaptivePolling';
import { calculateQueueHealth } from '@/utils/queueHealth';
import { QueueHealthWidget } from '@/components/queue/QueueHealthWidget';
import { AutoRefreshControls } from '@/components/queue/AutoRefreshControls';
import { NotificationSettings } from '@/components/notifications/NotificationSettings';
import { SoundAlerts } from '@/utils/soundAlerts';

interface QueueJob {
  id: string;
  name: string;
  data?: {
    bookId?: string;
    bookTitle?: string;
    frameworkId?: string;
    frameworkVersion?: string;
    triggeredBy?: string;
    isReEvaluation?: boolean;
  };
  state: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';
  progress: number;
  attemptsMade: number;
  failedReason?: string;
  timestamp: number;
}

export default function EvaluationQueuePage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<QueueJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'waiting' | 'active' | 'completed' | 'failed'>('all');
  const [selectedJob, setSelectedJob] = useState<QueueJob | null>(null);
  const [queuePaused, setQueuePaused] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [previousJobs, setPreviousJobs] = useState<QueueJob[]>([]);
  const [healthMetrics, setHealthMetrics] = useState<any>(null);
  const [failureHistory, setFailureHistory] = useState<Array<{ timestamp: string; rate: number }>>([]);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());
  const [showSettings, setShowSettings] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000);

  useEffect(() => {
    const permission = BrowserNotifications.getPermission();
    setNotificationsEnabled(permission === 'granted');

    // Initialize sound alerts from localStorage
    const soundEnabled = localStorage.getItem('soundAlertsEnabled');
    if (soundEnabled !== null) {
      SoundAlerts.setEnabled(soundEnabled === 'true');
    }
  }, []);

  // Use notification hook for queue status changes
  const queueStatus = {
    waiting: jobs.filter(j => j.state === 'waiting').length,
    active: jobs.filter(j => j.state === 'active').length,
    completed: jobs.filter(j => j.state === 'completed').length,
    failed: jobs.filter(j => j.state === 'failed').length,
    delayed: jobs.filter(j => j.state === 'delayed').length,
    isPaused: queuePaused,
  };
  useQueueNotifications(queueStatus, notificationsEnabled);

  // Check for max retries
  useEffect(() => {
    if (!notificationsEnabled || jobs.length === 0) return;

    jobs.forEach(job => {
      if (job.state === 'failed' && job.attemptsMade >= 3) {
        const previousJob = previousJobs.find(pj => pj.id === job.id);
        // Only notify once when job first reaches max retries
        if (!previousJob || previousJob.attemptsMade < 3) {
          BrowserNotifications.sendQueueAlert('max_retries', {
            jobId: job.id,
            attempts: job.attemptsMade,
          });
        }
      }
    });

    setPreviousJobs(jobs);
  }, [jobs, notificationsEnabled, previousJobs]);

  // Update tab title with queue stats
  useEffect(() => {
    const waiting = jobs.filter(j => j.state === 'waiting').length;
    const active = jobs.filter(j => j.state === 'active').length;
    const failed = jobs.filter(j => j.state === 'failed').length;

    if (waiting === 0 && active === 0 && failed === 0) {
      document.title = 'Queue Empty - Evaluation Queue';
    } else {
      const parts = [];
      if (failed > 0) parts.push(`${failed} failed`);
      if (active > 0) parts.push(`${active} active`);
      if (waiting > 0) parts.push(`${waiting} waiting`);

      document.title = `(${parts.join(', ')}) - Evaluation Queue`;
    }

    // Cleanup: restore original title on unmount
    return () => {
      document.title = 'Evaluation Queue';
    };
  }, [jobs]);

  const fetchJobs = useCallback(async () => {
    try {
      setError(null);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';
      const url = filter !== 'all'
        ? `${apiUrl}/admin/evaluation/queue/jobs?status=${filter}`
        : `${apiUrl}/admin/evaluation/queue/jobs`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          router.push('/login?redirect=/admin/evaluation/queue');
          return;
        }
        throw new Error('Failed to fetch queue jobs');
      }

      const data = await response.json();
      const jobsList = data.jobs || data;
      const jobs = Array.isArray(jobsList) ? jobsList : [];
      setJobs(jobs);
      setQueuePaused(data.queuePaused || false);

      // Calculate health metrics
      const status = {
        waiting: jobs.filter(j => j.state === 'waiting').length,
        active: jobs.filter(j => j.state === 'active').length,
        completed: jobs.filter(j => j.state === 'completed').length,
        failed: jobs.filter(j => j.state === 'failed').length,
        isPaused: data.queuePaused || false,
      };

      const recentCompleted = jobs.filter(j => j.state === 'completed');
      const recentFailed = jobs.filter(j => j.state === 'failed');

      const health = calculateQueueHealth(
        status,
        recentCompleted.map(j => ({ completedAt: new Date() })),
        recentFailed.map(j => ({ failedAt: new Date() }))
      );

      setHealthMetrics(health);
      setLastUpdateTime(new Date());

      // Update failure history for sparkline
      setFailureHistory(prev => {
        const newHistory = [
          ...prev,
          { timestamp: new Date().toISOString(), rate: health.failureRate },
        ];
        // Keep only last 100 points
        return newHistory.slice(-100);
      });
    } catch (err) {
      console.error('Error fetching queue jobs:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [filter, router]);

  // Use adaptive polling hook instead of manual setInterval
  useAdaptivePolling({
    onPoll: fetchJobs,
    baseInterval: refreshInterval,
    activeInterval: refreshInterval,
    inactiveInterval: refreshInterval * 3, // 3x slower when tab is inactive
    enabled: autoRefreshEnabled,
  });

  const handleRetryJob = async (jobId: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';
      const response = await fetch(`${apiUrl}/admin/evaluation/queue/jobs/${jobId}/retry`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to retry job');
      }

      await fetchJobs();
      alert('Job queued for retry');
    } catch (err) {
      alert(`Failed to retry job: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleRemoveJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to remove this job from the queue?')) {
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';
      const response = await fetch(`${apiUrl}/admin/evaluation/queue/jobs/${jobId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to remove job');
      }

      await fetchJobs();
      alert('Job removed from queue');
    } catch (err) {
      alert(`Failed to remove job: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleToggleQueue = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';
      const endpoint = queuePaused ? 'resume' : 'pause';
      const response = await fetch(`${apiUrl}/admin/evaluation/queue/${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to ${endpoint} queue`);
      }

      setQueuePaused(!queuePaused);
      alert(`Queue ${queuePaused ? 'resumed' : 'paused'} successfully`);
    } catch (err) {
      alert(`Failed to toggle queue: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'bg-yellow-100 text-yellow-800';
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'delayed': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const stats = {
    pending: jobs.filter(j => j.state === 'waiting').length,
    active: jobs.filter(j => j.state === 'active').length,
    completed: jobs.filter(j => j.state === 'completed').length,
    failed: jobs.filter(j => j.state === 'failed').length,
  };

  return (
    <AdminLayout>
      <div>
        <Breadcrumbs />
        <BackButton />
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-gray-900">Evaluation Queue</h2>
          <div className="flex gap-3">
            <AutoRefreshControls
              enabled={autoRefreshEnabled}
              interval={refreshInterval}
              onToggle={setAutoRefreshEnabled}
              onIntervalChange={setRefreshInterval}
            />
            <button
              onClick={handleToggleQueue}
              className={`px-4 py-2 rounded-lg text-white ${
                queuePaused ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'
              }`}
            >
              {queuePaused ? 'Resume Queue' : 'Pause Queue'}
            </button>
          </div>
        </div>

        <NotificationPermissionPrompt
          onPermissionChange={(permission) => {
            setNotificationsEnabled(permission === 'granted');
          }}
        />

        {healthMetrics && (
          <QueueHealthWidget
            health={healthMetrics}
            failureHistory={failureHistory}
            lastUpdateSeconds={Math.floor((Date.now() - lastUpdateTime.getTime()) / 1000)}
            onSettingsClick={() => setShowSettings(true)}
          />
        )}

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-gray-600">Pending</p>
            <p className="text-3xl font-bold text-yellow-800">{stats.pending}</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-gray-600">Active</p>
            <p className="text-3xl font-bold text-blue-800">{stats.active}</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-gray-600">Completed</p>
            <p className="text-3xl font-bold text-green-800">{stats.completed}</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-gray-600">Failed</p>
            <p className="text-3xl font-bold text-red-800">{stats.failed}</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mb-4 flex gap-2">
          {(['all', 'waiting', 'active', 'completed', 'failed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {status === 'waiting' ? 'Pending' : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">Error: {error}</p>
            <button
              onClick={fetchJobs}
              className="mt-2 text-sm text-red-600 hover:underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Jobs Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Book</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Framework</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attempts</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{job.data?.bookTitle || job.name || 'Unknown'}</div>
                    <div className="text-sm text-gray-500">{job.data?.bookId ? `${job.data.bookId.substring(0, 8)}...` : 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(job.state)}`}>
                      {job.state === 'waiting' ? 'Pending' : job.state.charAt(0).toUpperCase() + job.state.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{job.data?.frameworkVersion || 'N/A'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {job.data?.isReEvaluation ? 'Re-evaluation' : 'New'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {job.timestamp ? new Date(job.timestamp).toLocaleString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{job.attemptsMade || 0}</td>
                  <td className="px-6 py-4 text-right text-sm font-medium">
                    {job.state === 'failed' && (
                      <>
                        <button
                          onClick={() => setSelectedJob(job)}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          View Error
                        </button>
                        <button
                          onClick={() => handleRetryJob(job.id)}
                          className="text-green-600 hover:text-green-900 mr-4"
                        >
                          Retry
                        </button>
                      </>
                    )}
                    {(job.state === 'waiting' || job.state === 'failed') && (
                      <button
                        onClick={() => handleRemoveJob(job.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {jobs.length === 0 && !loading && (
            <div className="text-center py-12">
              <p className="text-gray-500">No jobs in queue</p>
            </div>
          )}
        </div>

        {/* Error Details Modal */}
        {selectedJob && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold">Job Error Details</h3>
                  <button
                    onClick={() => setSelectedJob(null)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <span className="text-2xl">&times;</span>
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Book:</p>
                    <p className="text-sm text-gray-900">{selectedJob.data?.bookTitle || selectedJob.name || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Job ID:</p>
                    <p className="text-sm text-gray-900">{selectedJob.id}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Attempts:</p>
                    <p className="text-sm text-gray-900">{selectedJob.attemptsMade}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Error:</p>
                    <div className="bg-red-50 p-4 rounded border border-red-200">
                      <pre className="text-sm text-red-900 whitespace-pre-wrap">
                        {selectedJob.failedReason || 'No error message available'}
                      </pre>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-2">
                  <button
                    onClick={() => handleRetryJob(selectedJob.id)}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Retry Job
                  </button>
                  <button
                    onClick={() => setSelectedJob(null)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notification Settings Modal */}
        {showSettings && (
          <NotificationSettings onClose={() => setShowSettings(false)} />
        )}
      </div>
    </AdminLayout>
  );
}
