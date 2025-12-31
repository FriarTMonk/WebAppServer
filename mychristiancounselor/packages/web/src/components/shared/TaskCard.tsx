'use client';

import { MemberTask } from '@/lib/api';

interface TaskCardProps {
  task: MemberTask;
  showActions?: boolean;
  isLoading?: boolean;
  onEdit?: (task: MemberTask) => void;
  onDelete?: (task: MemberTask) => void;
  onRemind?: (task: MemberTask) => void;
  onComplete?: (task: MemberTask) => void;
  onStartConversation?: (task: MemberTask) => void;
}

export function TaskCard({
  task,
  showActions = false,
  isLoading = false,
  onEdit,
  onDelete,
  onRemind,
  onComplete,
  onStartConversation,
}: TaskCardProps) {
  const getTypeBadge = (type: string) => {
    const badges = {
      conversation_prompt: 'bg-blue-100 text-blue-800',
      offline_task: 'bg-purple-100 text-purple-800',
      guided_conversation: 'bg-green-100 text-green-800',
    };
    const labels = {
      conversation_prompt: 'Conversation Topic',
      offline_task: 'Offline Task',
      guided_conversation: 'Guided Conversation',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${badges[type as keyof typeof badges]}`}>
        {labels[type as keyof typeof labels]}
      </span>
    );
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'text-gray-500',
      medium: 'text-yellow-600',
      high: 'text-red-600',
    };
    return colors[priority as keyof typeof colors] || 'text-gray-500';
  };

  const formatDate = (date?: string) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const isOverdue = task.status === 'overdue';
  const isCompleted = task.status === 'completed';

  return (
    <div
      className={`border rounded-lg p-4 ${
        isOverdue
          ? 'border-red-300 bg-red-50'
          : isCompleted
          ? 'border-gray-200 bg-gray-50'
          : 'border-gray-300 bg-white'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-gray-900">{task.title}</h4>
            {getTypeBadge(task.type)}
          </div>
          <p className="text-sm text-gray-600">{task.description}</p>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-500 mt-3">
        <span className={getPriorityColor(task.priority)}>
          Priority: {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
        </span>
        {task.dueDate && (
          <span>
            Due: {formatDate(task.dueDate)}
          </span>
        )}
        <span>
          Assigned: {formatDate(task.assignedAt)}
        </span>
        {isCompleted && task.completedAt && (
          <span className="text-green-600">
            Completed: {formatDate(task.completedAt)}
            {task.completionMethod && ` (${task.completionMethod})`}
          </span>
        )}
      </div>

      {task.counselorNotes && (
        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-gray-700">
          <span className="font-medium">Counselor notes:</span> {task.counselorNotes}
        </div>
      )}

      {showActions && (
        <div className="flex gap-2 mt-4">
          {!isCompleted && task.type === 'offline_task' && onComplete && (
            <button
              onClick={() => onComplete(task)}
              disabled={isLoading}
              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Completing...' : 'Mark Complete'}
            </button>
          )}
          {!isCompleted &&
            (task.type === 'conversation_prompt' || task.type === 'guided_conversation') &&
            onStartConversation && (
              <button
                onClick={() => onStartConversation(task)}
                disabled={isLoading}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Start Conversation
              </button>
            )}
          {!isCompleted && onEdit && (
            <button
              onClick={() => onEdit(task)}
              disabled={isLoading}
              className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Edit
            </button>
          )}
          {!isCompleted && onRemind && (
            <button
              onClick={() => onRemind(task)}
              disabled={isLoading}
              className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send Reminder
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(task)}
              disabled={isLoading}
              className="px-3 py-1 bg-red-100 text-red-700 text-sm rounded hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
