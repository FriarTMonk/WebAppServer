'use client';

import { useState } from 'react';
import { useCounselorMembers } from '@/hooks/useCounselorMembers';
import { WellbeingStatus } from '@mychristiancounselor/shared';

export default function CounselorDashboard() {
  const [selectedOrg] = useState<string | undefined>(undefined);
  const { members, loading, error } = useCounselorMembers(selectedOrg);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading your members...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Counselor Dashboard
        </h1>
        <p className="text-gray-600">
          Monitor and support your assigned members' spiritual wellbeing
        </p>
      </div>

      {members.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600">
            No members assigned yet. Contact your administrator to get started.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
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
                  Sessions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {members.map((memberSummary) => (
                <tr key={memberSummary.member.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div
                      className="flex items-center justify-center w-8 h-8 rounded-full"
                      title={`Status: ${memberSummary.wellbeingStatus.status}`}
                    >
                      <span className="text-2xl">
                        {getStoplightEmoji(memberSummary.wellbeingStatus.status)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {memberSummary.member.firstName} {memberSummary.member.lastName}
                    </div>
                    <div className="text-sm text-gray-500">
                      {memberSummary.member.email}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-md">
                      {memberSummary.wellbeingStatus.summary}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {memberSummary.lastConversationDate
                      ? new Date(memberSummary.lastConversationDate).toLocaleDateString()
                      : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {memberSummary.totalConversations}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {memberSummary.observationCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                      onClick={() => {
                        // TODO: Navigate to member sessions
                        alert('View Sessions - Coming in next task');
                      }}
                    >
                      View Sessions
                    </button>
                    <button
                      className="text-indigo-600 hover:text-indigo-900"
                      onClick={() => {
                        // TODO: Add observation
                        alert('Add Observation - Coming in Phase 3');
                      }}
                    >
                      Add Note
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
