'use client';

import { useState, useEffect } from 'react';
import { useCounselorMembers } from '@/hooks/useCounselorMembers';
import { WellbeingStatus, CounselorMemberSummary } from '@mychristiancounselor/shared';
import OverrideStatusModal from './OverrideStatusModal';
import MemberProfileModal from './MemberProfileModal';
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
  const [selectedSummary, setSelectedSummary] = useState<CounselorMemberSummary | null>(null);

  // ESC key handler for summary dialog
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedSummary(null);
      }
    };

    if (selectedSummary) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }

    return undefined;
  }, [selectedSummary]);

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
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {memberSummary.member.firstName} {memberSummary.member.lastName}
                        </div>
                        <div className="text-sm text-gray-500">{memberSummary.member.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {memberSummary.wellbeingStatus?.summary || 'No analysis yet'}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Analyzed: {formatDate(memberSummary.wellbeingStatus?.lastAnalyzedAt)}
                      </div>
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <button
                        onClick={() => handleManualRefresh(memberSummary.member.id)}
                        disabled={refreshing === memberSummary.member.id}
                        className="text-blue-600 hover:text-blue-900 disabled:text-gray-400"
                      >
                        {refreshing === memberSummary.member.id ? '↻ Refreshing...' : '↻ Refresh'}
                      </button>
                      <button
                        onClick={() => handleOpenOverride(memberSummary)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Override
                      </button>
                      <button
                        onClick={() => window.location.href = `/counsel/member/${memberSummary.member.id}/journal`}
                        className="text-purple-600 hover:text-purple-900"
                      >
                        Journal
                      </button>
                      <button
                        onClick={() =>
                          setProfileModal({
                            memberId: memberSummary.member.id,
                            memberName: `${memberSummary.member.firstName} ${memberSummary.member.lastName}`,
                            organizationId: memberSummary.assignment.organizationId,
                          })
                        }
                        className="text-green-600 hover:text-green-900"
                      >
                        Profile
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
    </div>
  );
}
