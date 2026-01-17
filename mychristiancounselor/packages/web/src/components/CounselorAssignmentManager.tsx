'use client';

import { useState, useEffect } from 'react';
import { CounselorAssignment } from '@mychristiancounselor/shared';
import AssignCounselorModal from './AssignCounselorModal';

export default function CounselorAssignmentManager() {
  const [assignments, setAssignments] = useState<CounselorAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<string>('');

  useEffect(() => {
    fetchAssignments();
  }, []); // Only run on mount

  async function fetchAssignments() {
    try {
      setLoading(true);
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697') + '/v1';
      const token = localStorage.getItem('accessToken');

      if (!token) {
        setError('Not authenticated');
        return;
      }

      // Get user's organizations
      const userResponse = await fetch(`${apiUrl}/profile/organizations`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!userResponse.ok) {
        throw new Error('Failed to fetch user organizations');
      }

      const orgs = await userResponse.json();
      console.log('User organizations:', orgs);
      const orgId = orgs?.[0]?.organization?.id;
      console.log('Extracted orgId:', orgId);

      if (!orgId) {
        console.error('No organization ID found in user profile!');
        setAssignments([]);
        return;
      }

      console.log('Setting selectedOrg to:', orgId);
      setSelectedOrg(orgId);

      const response = await fetch(
        `${apiUrl}/org-admin/counselor-assignments?organizationId=${orgId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch assignments');
      }

      const data = await response.json();
      setAssignments(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  async function handleEndAssignment(assignmentId: string) {
    if (!confirm('Are you sure you want to end this counselor assignment?')) {
      return;
    }

    try {
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697') + '/v1';
      const token = localStorage.getItem('accessToken');

      const response = await fetch(
        `${apiUrl}/org-admin/counselor-assignments/${assignmentId}?organizationId=${selectedOrg}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to end assignment');
      }

      await fetchAssignments();
    } catch (err) {
      alert('Error ending assignment: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg">Loading assignments...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  const activeAssignments = assignments.filter(a => a.status === 'active');
  const inactiveAssignments = assignments.filter(a => a.status === 'inactive');

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Counselor Assignments
          </h1>
          <p className="text-gray-600">
            Manage counselor-member relationships for pastoral care
          </p>
        </div>
        <button
          onClick={() => {
            console.log('Assign Counselor clicked. selectedOrg:', selectedOrg);
            setShowAssignModal(true);
          }}
          disabled={!selectedOrg || loading}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Assign Counselor
        </button>
      </div>

      <div className="space-y-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">
            Active Assignments ({activeAssignments.length})
          </h2>
          {activeAssignments.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600">
              No active assignments. Click "Assign Counselor" to create one.
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Member
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Counselor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Assigned Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {activeAssignments.map((assignment) => (
                    <tr key={assignment.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {assignment.member?.firstName} {assignment.member?.lastName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {assignment.member?.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {assignment.counselor?.firstName} {assignment.counselor?.lastName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {assignment.counselor?.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(assignment.assignedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleEndAssignment(assignment.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          End Assignment
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {inactiveAssignments.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">
              Inactive Assignments ({inactiveAssignments.length})
            </h2>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Member
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Counselor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Assigned Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Ended Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {inactiveAssignments.map((assignment) => (
                    <tr key={assignment.id} className="bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          {assignment.member?.firstName} {assignment.member?.lastName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          {assignment.counselor?.firstName} {assignment.counselor?.lastName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(assignment.assignedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {assignment.endedAt
                          ? new Date(assignment.endedAt).toLocaleDateString()
                          : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showAssignModal && (
        <AssignCounselorModal
          organizationId={selectedOrg}
          onClose={() => setShowAssignModal(false)}
          onSuccess={() => {
            setShowAssignModal(false);
            fetchAssignments();
          }}
        />
      )}
    </div>
  );
}
