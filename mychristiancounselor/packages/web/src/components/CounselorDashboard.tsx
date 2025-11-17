'use client';

import { useState } from 'react';
import { useCounselorMembers } from '@/hooks/useCounselorMembers';
import { WellbeingStatus, CounselorMemberSummary } from '@mychristiancounselor/shared';
import OverrideStatusModal from './OverrideStatusModal';

export default function CounselorDashboard() {
  const [selectedOrg] = useState<string | undefined>(undefined);
  const { members, loading, error, refetch } = useCounselorMembers(selectedOrg);
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [overrideModal, setOverrideModal] = useState<{
    memberName: string;
    memberId: string;
    currentStatus: WellbeingStatus;
    aiStatus: WellbeingStatus;
  } | null>(null);

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
      const token = localStorage.getItem('token');
      const url = selectedOrg
        ? `/api/counsel/members/${memberId}/refresh-analysis?organizationId=${selectedOrg}`
        : `/api/counsel/members/${memberId}/refresh-analysis`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to refresh analysis');
      }

      // Refresh the member list
      await refetch();
    } catch (err) {
      console.error('Failed to refresh analysis:', err);
      alert('Failed to refresh analysis. Please try again.');
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Counselor Dashboard</h1>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Refresh All
        </button>
      </div>

      {members.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
          <p>You have no assigned members yet. Contact your organization admin to assign members to you.</p>
        </div>
      ) : (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
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
                      {formatDate(memberSummary.lastConversationDate)}
                      <div className="text-xs text-gray-400">
                        {memberSummary.totalConversations} total
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
                      <button className="text-indigo-600 hover:text-indigo-900">
                        View
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
          organizationId={selectedOrg || ''}
          onClose={() => setOverrideModal(null)}
          onSuccess={() => {
            refetch();
            setOverrideModal(null);
          }}
        />
      )}
    </div>
  );
}
