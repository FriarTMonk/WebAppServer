'use client';

import { CheckSquare, ClipboardList, Workflow } from 'lucide-react';

export interface DashboardSummaryWidgetsProps {
  taskStats: {
    total: number;
    pending: number;
    overdue: number;
  };
  assessmentStats: {
    total: number;
    phq9: number;
    gad7: number;
  };
  ruleStats: {
    total: number;
    platform: number;
    organization: number;
    counselor: number;
  };
  onTasksClick: () => void;
  onAssessmentsClick: () => void;
  onRulesClick: () => void;
}

const cardClassName =
  'bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow text-left border border-gray-200 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none';

export default function DashboardSummaryWidgets({
  taskStats,
  assessmentStats,
  ruleStats,
  onTasksClick,
  onAssessmentsClick,
  onRulesClick,
}: DashboardSummaryWidgetsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* Active Tasks Card */}
      <button
        type="button"
        onClick={onTasksClick}
        className={cardClassName}
        aria-label="View and filter members with active tasks"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-600">Active Tasks</h3>
          <CheckSquare className="h-5 w-5 text-blue-500" />
        </div>
        <div className="text-2xl font-bold text-gray-900 mb-1">
          {taskStats.total}
        </div>
        <div className="text-xs text-gray-500">
          {taskStats.pending} Pending • {taskStats.overdue} Overdue
        </div>
      </button>

      {/* Pending Assessments Card */}
      <button
        type="button"
        onClick={onAssessmentsClick}
        className={cardClassName}
        aria-label="View and filter members with pending assessments"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-600">Pending Assessments</h3>
          <ClipboardList className="h-5 w-5 text-green-500" />
        </div>
        <div className="text-2xl font-bold text-gray-900 mb-1">
          {assessmentStats.total}
        </div>
        <div className="text-xs text-gray-500">
          {assessmentStats.phq9} PHQ-9 • {assessmentStats.gad7} GAD-7
        </div>
      </button>

      {/* Active Rules Card */}
      <button
        type="button"
        onClick={onRulesClick}
        className={cardClassName}
        aria-label="Manage workflow rules"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-600">Active Workflow Rules</h3>
          <Workflow className="h-5 w-5 text-purple-500" />
        </div>
        <div className="text-2xl font-bold text-gray-900 mb-1">
          {ruleStats.total}
        </div>
        <div className="text-xs text-gray-500">
          {ruleStats.platform} Platform • {ruleStats.organization} Org • {ruleStats.counselor} My Rules
        </div>
      </button>
    </div>
  );
}
