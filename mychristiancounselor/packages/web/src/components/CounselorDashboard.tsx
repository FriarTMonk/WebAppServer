'use client';

import { useState, useEffect } from 'react';
import { useCounselorMembers } from '@/hooks/useCounselorMembers';
import { WellbeingStatus, CounselorMemberSummary } from '@mychristiancounselor/shared';
import OverrideStatusModal from './OverrideStatusModal';
import MemberProfileModal from './MemberProfileModal';
import HistoricalTrendsModal from './HistoricalTrendsModal';
import AssignTaskModal from './AssignTaskModal';
import ViewTasksModal from './ViewTasksModal';
import AssignAssessmentModal from './AssignAssessmentModal';
import ViewAssessmentsModal from './ViewAssessmentsModal';
import WorkflowRulesModal from './WorkflowRulesModal';
import { StatusColumnBadges } from './StatusColumnBadges';
import { apiPost } from '@/lib/api';
import { TourButton } from './TourButton';

export default function CounselorDashboard() {
  const [selectedOrg] = useState<string | undefined>(undefined);
  const { members, loading, error, refetch } = useCounselorMembers(selectedOrg);
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [overrideModal, setOverrideModal] = useState<{
    memberName: string;
    memberId: string;
    currentStatus: WellbeingStatus;
    aiStatus: WellbeingStatus;
    organizationId: string;
  } | null>(null);
  const [profileModal, setProfileModal] = useState<{
    memberId: string;
    memberName: string;
    organizationId: string;
  } | null>(null);
  const [historicalTrendsModal, setHistoricalTrendsModal] = useState<{
    memberName: string;
    memberId: string;
  } | null>(null);
  const [assignTaskModal, setAssignTaskModal] = useState<{
    memberName: string;
    memberId: string;
  } | null>(null);
  const [viewTasksModal, setViewTasksModal] = useState<{
    memberName: string;
    memberId: string;
  } | null>(null);
  const [assignAssessmentModal, setAssignAssessmentModal] = useState<{
    memberName: string;
    memberId: string;
  } | null>(null);
  const [viewAssessmentsModal, setViewAssessmentsModal] = useState<{
    memberName: string;
    memberId: string;
  } | null>(null);
  const [workflowRulesModal, setWorkflowRulesModal] = useState<{
    memberName: string;
    memberId: string;
    organizationId: string;
  } | null>(null);
  const [selectedSummary, setSelectedSummary] = useState<CounselorMemberSummary | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);

  // ESC key handler for summary dialog and close dropdowns on outside click
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedSummary(null);
        setOpenDropdown(null);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-dropdown-menu]') && !target.closest('[data-dropdown-button]')) {
        setOpenDropdown(null);
        setDropdownPosition(null);
      }
    };

    if (selectedSummary) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }

    if (openDropdown) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('click', handleClickOutside);
      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.removeEventListener('click', handleClickOutside);
      };
    }

    return undefined;
  }, [selectedSummary, openDropdown]);

  const getStoplightEmoji = (status: WellbeingStatus) => {
    switch (status) {
      case 'red':
        return '🔴';
      case 'yellow':
        return '🟡';
      case 'green':
        return '🟢';
      default:
        return '⚪';
    }
  };

  const formatDate = (date?: Date) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString();
  };

  const handleManualRefresh = async (memberId: string) => {
    setRefreshing(memberId);
    try {
      const endpoint = selectedOrg
        ? `/counsel/members/${memberId}/refresh-analysis?organizationId=${selectedOrg}`
        : `/counsel/members/${memberId}/refresh-analysis`;

      const response = await apiPost(endpoint);

      if (!response.ok) {
        // Try to get error details from response
        let errorMessage = 'Failed to refresh analysis';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          errorMessage = `${errorMessage} (Status: ${response.status} ${response.statusText})`;
        }
        throw new Error(errorMessage);
      }

      // Refresh the member list
      await refetch();
    } catch (err) {
      console.error('Failed to refresh analysis:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh analysis. Please try again.';
      alert(errorMessage);
    } finally {
      setRefreshing(null);
    }
  };

  const handleOpenOverride = (memberSummary: CounselorMemberSummary) => {
    setOverrideModal({
      memberName: `${memberSummary.member.firstName} ${memberSummary.member.lastName}`,
      memberId: memberSummary.member.id,
      currentStatus: memberSummary.wellbeingStatus?.status || 'green',
      aiStatus: memberSummary.wellbeingStatus?.aiSuggestedStatus || 'green',
      organizationId: memberSummary.assignment.organizationId,
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Loading counselor dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>Error loading dashboard: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <button
          onClick={() => window.history.back()}
          className="text-blue-600 hover:text-blue-700 flex items-center gap-2 mb-4"
        >
          ← Back
        </button>
      </div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Counselor Dashboard</h1>
        <div className="flex items-center gap-3">
          <TourButton />
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Refresh All
          </button>
        </div>
      </div>

      {members.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
          <p>You have no assigned members yet. Contact your organization admin to assign members to you.</p>
        </div>
      ) : (
        <div className="bg-white shadow-md rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Member
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  7-Day Summary
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Active
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {members.map((memberSummary) => {
                const isOverridden = memberSummary.wellbeingStatus?.overriddenBy;
                const displayStatus = memberSummary.wellbeingStatus?.status || 'green';
                const aiStatus = memberSummary.wellbeingStatus?.aiSuggestedStatus;

                return (
                  <tr key={memberSummary.member.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl" title={isOverridden ? `AI suggested: ${aiStatus}` : 'AI status'}>
                            {getStoplightEmoji(displayStatus)}
                          </span>
                          {isOverridden && (
                            <span className="text-xs text-gray-500" title="Counselor overridden">
                              ✏️
                            </span>
                          )}
                        </div>
                        <StatusColumnBadges
                          pendingTasks={memberSummary.pendingTasks}
                          overdueTasks={memberSummary.overdueTasks}
                          pendingAssessments={memberSummary.pendingAssessments}
                          onTasksClick={() => {
                            setViewTasksModal({
                              memberName: `${memberSummary.member.firstName} ${memberSummary.member.lastName}`,
                              memberId: memberSummary.member.id,
                            });
                          }}
                          onAssessmentsClick={() => {
                            setViewAssessmentsModal({
                              memberName: `${memberSummary.member.firstName} ${memberSummary.member.lastName}`,
                              memberId: memberSummary.member.id,
                            });
                          }}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {memberSummary.member.firstName} {memberSummary.member.lastName}
                        </div>
                        <div className="text-sm text-gray-500">{memberSummary.member.email}</div>
                      </div>
                    </td>
                    {/* Desktop: Show full summary inline */}
                    <td className="px-6 py-4 hidden lg:table-cell">
                      <div className="text-sm text-gray-900">
                        {memberSummary.wellbeingStatus?.summary || 'No analysis yet'}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Analyzed: {formatDate(memberSummary.wellbeingStatus?.lastAnalyzedAt)}
                      </div>
                    </td>

                    {/* Mobile: Show "View Summary" link */}
                    <td className="px-6 py-4 lg:hidden">
                      <button
                        onClick={() => setSelectedSummary(memberSummary)}
                        className="text-blue-600 hover:text-blue-900 text-sm font-medium underline"
                      >
                        View Summary
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(memberSummary.lastLogin)}
                      <div className="text-xs text-gray-400">
                        {memberSummary.totalConversations} sessions
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(memberSummary.lastActive)}
                      <div className="text-xs text-gray-400">
                        last question
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        data-dropdown-button
                        onClick={(e) => {
                          e.stopPropagation();
                          const button = e.currentTarget;
                          const rect = button.getBoundingClientRect();

                          if (openDropdown === memberSummary.member.id) {
                            setOpenDropdown(null);
                            setDropdownPosition(null);
                          } else {
                            setOpenDropdown(memberSummary.member.id);
                            setDropdownPosition({
                              top: rect.bottom + 4,
                              left: rect.right - 192, // 192px = w-48 (menu width)
                            });
                          }
                        }}
                        className="px-3 py-1 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded flex items-center gap-1"
                      >
                        Actions
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {overrideModal && (
        <OverrideStatusModal
          memberName={overrideModal.memberName}
          memberId={overrideModal.memberId}
          currentStatus={overrideModal.currentStatus}
          aiSuggestedStatus={overrideModal.aiStatus}
          organizationId={overrideModal.organizationId}
          onClose={() => setOverrideModal(null)}
          onSuccess={() => {
            refetch();
            setOverrideModal(null);
          }}
        />
      )}

      {profileModal && (
        <MemberProfileModal
          memberId={profileModal.memberId}
          memberName={profileModal.memberName}
          organizationId={profileModal.organizationId}
          onClose={() => setProfileModal(null)}
        />
      )}

      {historicalTrendsModal && (
        <HistoricalTrendsModal
          memberName={historicalTrendsModal.memberName}
          memberId={historicalTrendsModal.memberId}
          onClose={() => setHistoricalTrendsModal(null)}
        />
      )}

      {assignTaskModal && (
        <AssignTaskModal
          memberName={assignTaskModal.memberName}
          memberId={assignTaskModal.memberId}
          onClose={() => setAssignTaskModal(null)}
          onSuccess={() => {
            refetch();
            setAssignTaskModal(null);
          }}
        />
      )}

      {viewTasksModal && (
        <ViewTasksModal
          memberName={viewTasksModal.memberName}
          memberId={viewTasksModal.memberId}
          onClose={() => setViewTasksModal(null)}
          onSuccess={() => {
            refetch();
            setViewTasksModal(null);
          }}
        />
      )}

      {assignAssessmentModal && (
        <AssignAssessmentModal
          memberName={assignAssessmentModal.memberName}
          memberId={assignAssessmentModal.memberId}
          onClose={() => setAssignAssessmentModal(null)}
          onSuccess={() => {
            refetch();
            setAssignAssessmentModal(null);
          }}
        />
      )}

      {viewAssessmentsModal && (
        <ViewAssessmentsModal
          memberName={viewAssessmentsModal.memberName}
          memberId={viewAssessmentsModal.memberId}
          onClose={() => setViewAssessmentsModal(null)}
        />
      )}

      {workflowRulesModal && (
        <WorkflowRulesModal
          memberName={workflowRulesModal.memberName}
          memberId={workflowRulesModal.memberId}
          organizationId={workflowRulesModal.organizationId}
          onClose={() => setWorkflowRulesModal(null)}
          onSuccess={() => {
            refetch();
            setWorkflowRulesModal(null);
          }}
        />
      )}

      {/* Actions dropdown modal - anchored to button */}
      {openDropdown && dropdownPosition && (
        <div
          data-dropdown-menu
          className="fixed w-48 bg-white rounded-md shadow-lg z-50 border border-gray-200"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
          }}
        >
          <div className="py-1">
            <button
              onClick={() => {
                const memberSummary = members.find(m => m.member.id === openDropdown);
                if (memberSummary) {
                  setProfileModal({
                    memberId: memberSummary.member.id,
                    memberName: `${memberSummary.member.firstName} ${memberSummary.member.lastName}`,
                    organizationId: memberSummary.assignment.organizationId,
                  });
                }
                setOpenDropdown(null);
                setDropdownPosition(null);
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Observations
            </button>
            <button
              onClick={() => {
                const memberSummary = members.find(m => m.member.id === openDropdown);
                if (memberSummary) {
                  handleOpenOverride(memberSummary);
                }
                setOpenDropdown(null);
                setDropdownPosition(null);
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Override Status
            </button>
            <button
              onClick={() => {
                const memberId = openDropdown;
                handleManualRefresh(memberId);
                setOpenDropdown(null);
                setDropdownPosition(null);
              }}
              disabled={refreshing === openDropdown}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:text-gray-400 disabled:hover:bg-white"
            >
              {refreshing === openDropdown ? '↻ Refreshing...' : '↻ Refresh Analysis'}
            </button>
            <div className="border-t border-gray-200 my-1"></div>
            <button
              onClick={() => {
                const memberSummary = members.find(m => m.member.id === openDropdown);
                if (memberSummary) {
                  setHistoricalTrendsModal({
                    memberName: `${memberSummary.member.firstName} ${memberSummary.member.lastName}`,
                    memberId: memberSummary.member.id,
                  });
                }
                setOpenDropdown(null);
                setDropdownPosition(null);
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Historical Trends
            </button>
            <button
              onClick={() => {
                const memberSummary = members.find(m => m.member.id === openDropdown);
                if (memberSummary) {
                  setAssignTaskModal({
                    memberName: `${memberSummary.member.firstName} ${memberSummary.member.lastName}`,
                    memberId: memberSummary.member.id,
                  });
                }
                setOpenDropdown(null);
                setDropdownPosition(null);
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Assign Task
            </button>
            <button
              onClick={() => {
                const memberSummary = members.find(m => m.member.id === openDropdown);
                if (memberSummary) {
                  setViewTasksModal({
                    memberName: `${memberSummary.member.firstName} ${memberSummary.member.lastName}`,
                    memberId: memberSummary.member.id,
                  });
                }
                setOpenDropdown(null);
                setDropdownPosition(null);
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              View Tasks
            </button>
            <button
              onClick={() => {
                const memberSummary = members.find(m => m.member.id === openDropdown);
                if (memberSummary) {
                  setAssignAssessmentModal({
                    memberName: `${memberSummary.member.firstName} ${memberSummary.member.lastName}`,
                    memberId: memberSummary.member.id,
                  });
                }
                setOpenDropdown(null);
                setDropdownPosition(null);
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Assign Assessment
            </button>
            <button
              onClick={() => {
                const memberSummary = members.find(m => m.member.id === openDropdown);
                if (memberSummary) {
                  setViewAssessmentsModal({
                    memberName: `${memberSummary.member.firstName} ${memberSummary.member.lastName}`,
                    memberId: memberSummary.member.id,
                  });
                }
                setOpenDropdown(null);
                setDropdownPosition(null);
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              View Assessments
            </button>
            <button
              onClick={() => {
                const memberId = openDropdown;
                if (memberId) {
                  window.location.href = `/counsel/member/${memberId}/journal`;
                }
                setOpenDropdown(null);
                setDropdownPosition(null);
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              View Journal
            </button>
            <button
              onClick={() => {
                const memberSummary = members.find(m => m.member.id === openDropdown);
                if (memberSummary) {
                  setWorkflowRulesModal({
                    memberName: `${memberSummary.member.firstName} ${memberSummary.member.lastName}`,
                    memberId: memberSummary.member.id,
                    organizationId: memberSummary.assignment.organizationId,
                  });
                }
                setOpenDropdown(null);
                setDropdownPosition(null);
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Workflow Rules
            </button>
          </div>
        </div>
      )}

      {selectedSummary && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedSummary(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  7-Day Summary
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedSummary.member.firstName} {selectedSummary.member.lastName}
                </p>
              </div>
              <button
                onClick={() => setSelectedSummary(null)}
                className="text-gray-400 hover:text-gray-500"
                aria-label="Close dialog"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="text-sm text-gray-900 whitespace-pre-wrap">
                {selectedSummary.wellbeingStatus?.summary || 'No analysis yet'}
              </div>
              <div className="text-xs text-gray-500 mt-4 pt-4 border-t border-gray-200">
                Analyzed: {formatDate(selectedSummary.wellbeingStatus?.lastAnalyzedAt)}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
              <button
                onClick={() => setSelectedSummary(null)}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
