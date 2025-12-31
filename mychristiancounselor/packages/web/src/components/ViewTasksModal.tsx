'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { MemberTask, taskApi } from '@/lib/api';
import { TaskCard } from './shared/TaskCard';

interface ViewTasksModalProps {
  memberName: string;
  memberId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ViewTasksModal({
  memberName,
  memberId,
  onClose,
  onSuccess,
}: ViewTasksModalProps) {
  const [tasks, setTasks] = useState<MemberTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await taskApi.getMemberTasks(memberId);
      if (!response.ok) {
        let errorMessage = 'Failed to load tasks';
        try {
          const data = await response.json();
          errorMessage = data.message || errorMessage;
        } catch {
          // Use default message
        }
        throw new Error(errorMessage);
      }
      const data = await response.json();
      setTasks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleEdit = async (task: MemberTask) => {
    // TODO: Open edit modal (simplified for now - just show prompt)
    const newTitle = prompt('Edit title:', task.title);
    if (newTitle && newTitle !== task.title) {
      setActionInProgress(task.id);
      try {
        const response = await taskApi.update(task.id, { title: newTitle });
        if (!response.ok) {
          let errorMessage = 'Failed to update task';
          try {
            const data = await response.json();
            errorMessage = data.message || errorMessage;
          } catch {
            // Use default message
          }
          throw new Error(errorMessage);
        }
        await fetchTasks();
        onSuccess();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update task');
      } finally {
        setActionInProgress(null);
      }
    }
  };

  const handleDelete = async (task: MemberTask) => {
    if (!confirm(`Delete task "${task.title}"?`)) return;

    setActionInProgress(task.id);
    try {
      const response = await taskApi.delete(task.id);
      if (!response.ok) {
        let errorMessage = 'Failed to delete task';
        try {
          const data = await response.json();
          errorMessage = data.message || errorMessage;
        } catch {
          // Use default message
        }
        throw new Error(errorMessage);
      }
      await fetchTasks();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRemind = async (task: MemberTask) => {
    setActionInProgress(task.id);
    try {
      const response = await taskApi.sendReminder(task.id);
      if (!response.ok) {
        let errorMessage = 'Failed to send reminder';
        try {
          const data = await response.json();
          errorMessage = data.message || errorMessage;
        } catch {
          // Use default message
        }
        throw new Error(errorMessage);
      }
      alert('Reminder sent successfully');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to send reminder');
    } finally {
      setActionInProgress(null);
    }
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
            Tasks for {memberName}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            View and manage assigned tasks
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
            <div className="text-center text-gray-500 py-8">
              No tasks assigned yet
            </div>
          ) : (
            <>
              {/* Overdue Tasks */}
              {overdueTasks.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-red-600 mb-3">
                    Overdue ({overdueTasks.length})
                  </h3>
                  <div className="space-y-3">
                    {overdueTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        showActions={true}
                        onEdit={() => handleEdit(task)}
                        onDelete={() => handleDelete(task)}
                        onRemind={() => handleRemind(task)}
                      />
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
                        onEdit={() => handleEdit(task)}
                        onDelete={() => handleDelete(task)}
                        onRemind={() => handleRemind(task)}
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
