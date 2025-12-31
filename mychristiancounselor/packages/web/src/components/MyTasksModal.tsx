'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { MemberTask, taskApi } from '@/lib/api';
import { TaskCard } from './shared/TaskCard';
import { showToast } from './Toast';
import { parseErrorMessage } from '@/lib/error-utils';

interface MyTasksModalProps {
  onClose: () => void;
  onTaskUpdate?: () => void;
}

export default function MyTasksModal({ onClose, onTaskUpdate }: MyTasksModalProps) {
  const [tasks, setTasks] = useState<MemberTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const router = useRouter();

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

  const fetchTasks = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const response = await taskApi.getMyTasks();

      // Check if request was aborted
      if (signal?.aborted) return;

      if (!response.ok) {
        const errorMessage = await parseErrorMessage(response, 'Failed to load tasks');
        throw new Error(errorMessage);
      }
      const data = await response.json();

      // Check again before setting state
      if (signal?.aborted) return;

      setTasks(data);
    } catch (err) {
      if (signal?.aborted) return;
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const abortController = new AbortController();
    fetchTasks(abortController.signal);
    return () => abortController.abort();
  }, [fetchTasks]);

  const handleComplete = async (task: MemberTask) => {
    if (task.type !== 'offline_task') {
      return;
    }

    setActionInProgress(task.id);
    try {
      const response = await taskApi.complete(task.id);
      if (!response.ok) {
        const errorMessage = await parseErrorMessage(response, 'Failed to mark task as complete');
        throw new Error(errorMessage);
      }
      showToast('Task marked as complete', 'success');
      await fetchTasks();
      if (onTaskUpdate) {
        onTaskUpdate();
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to mark task as complete';
      setError(errorMsg);
      showToast(errorMsg, 'error');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleStartConversation = async (task: MemberTask) => {
    // Navigate to /counsel page for conversation tasks
    router.push('/counsel');
    onClose();
  };

  const pendingTasks = useMemo(() => tasks.filter((t) => t.status === 'pending'), [tasks]);
  const overdueTasks = useMemo(() => tasks.filter((t) => t.status === 'overdue'), [tasks]);
  const completedTasks = useMemo(() => tasks.filter((t) => t.status === 'completed'), [tasks]);

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
            My Tasks
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            View and manage your assigned tasks
          </p>
        </div>

        <div className="px-6 py-4">
          {loading ? (
            <div className="text-center text-gray-500 py-8">Loading tasks...</div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {error}
            </div>
          ) : tasks.length === 0 ? (
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
              <h3 className="mt-2 text-sm font-medium text-gray-900">No tasks assigned</h3>
              <p className="mt-1 text-sm text-gray-500">
                Your counselor hasn't assigned any tasks yet.
              </p>
            </div>
          ) : (
            <>
              {/* Overdue Tasks */}
              {overdueTasks.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-lg font-semibold text-red-600">
                      Overdue ({overdueTasks.length})
                    </h3>
                    <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                      Urgent
                    </span>
                  </div>
                  <div className="space-y-3">
                    {overdueTasks.map((task) => (
                      <div key={task.id} className="border-2 border-red-300 rounded-lg">
                        <TaskCard
                          task={task}
                          showActions={true}
                          isLoading={actionInProgress === task.id}
                          onComplete={handleComplete}
                          onStartConversation={handleStartConversation}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pending Tasks */}
              {pendingTasks.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Pending ({pendingTasks.length})
                  </h3>
                  <div className="space-y-3">
                    {pendingTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        showActions={true}
                        isLoading={actionInProgress === task.id}
                        onComplete={handleComplete}
                        onStartConversation={handleStartConversation}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Completed Tasks */}
              {completedTasks.length > 0 && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowCompleted(!showCompleted)}
                    className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2 hover:text-gray-700"
                    aria-expanded={showCompleted}
                    aria-controls="completed-tasks-section"
                  >
                    Completed ({completedTasks.length})
                    <span className="text-sm">{showCompleted ? '▲' : '▼'}</span>
                  </button>
                  {showCompleted && (
                    <div id="completed-tasks-section" className="space-y-3">
                      {completedTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          showActions={false}
                        />
                      ))}
                    </div>
                  )}
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
