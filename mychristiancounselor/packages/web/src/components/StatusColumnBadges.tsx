'use client';

interface StatusColumnBadgesProps {
  pendingTasks: number;
  overdueTasks: number;
  pendingAssessments: number;
  onTasksClick: () => void;
  onAssessmentsClick: () => void;
}

export function StatusColumnBadges({
  pendingTasks,
  overdueTasks,
  pendingAssessments,
  onTasksClick,
  onAssessmentsClick,
}: StatusColumnBadgesProps) {
  const totalTasks = pendingTasks + overdueTasks;

  if (totalTasks === 0 && pendingAssessments === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {totalTasks > 0 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onTasksClick();
          }}
          className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
            overdueTasks > 0
              ? 'bg-orange-100 text-orange-800 hover:bg-orange-200'
              : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
          }`}
          title={overdueTasks > 0 ? `${pendingTasks} pending, ${overdueTasks} overdue` : `${totalTasks} pending`}
        >
          {totalTasks} Task{totalTasks !== 1 ? 's' : ''}
        </button>
      )}
      {pendingAssessments > 0 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAssessmentsClick();
          }}
          className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 hover:bg-yellow-200 transition-colors"
          title={`${pendingAssessments} pending assessment${pendingAssessments !== 1 ? 's' : ''}`}
        >
          {pendingAssessments} Assessment{pendingAssessments !== 1 ? 's' : ''}
        </button>
      )}
    </div>
  );
}
