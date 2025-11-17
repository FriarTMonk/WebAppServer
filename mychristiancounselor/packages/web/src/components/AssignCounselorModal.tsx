'use client';

import { useState, useEffect } from 'react';
import { CreateCounselorAssignmentDto } from '@mychristiancounselor/shared';

interface AssignCounselorModalProps {
  organizationId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AssignCounselorModal({
  organizationId,
  onClose,
  onSuccess,
}: AssignCounselorModalProps) {
  const [counselors, setCounselors] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [selectedCounselor, setSelectedCounselor] = useState('');
  const [selectedMember, setSelectedMember] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [organizationId]);

  async function fetchData() {
    try {
      const token = localStorage.getItem('token');

      // Fetch organization members
      const response = await fetch(
        `/api/organization/${organizationId}/members`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch members');
      }

      const data = await response.json();
      const allMembers = data.members || [];

      // Filter counselors (those with Counselor role)
      const counselorList = allMembers.filter((m: any) =>
        m.role?.name?.includes('Counselor')
      );

      // All members can be assigned
      setCounselors(counselorList);
      setMembers(allMembers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedCounselor || !selectedMember) {
      setError('Please select both a counselor and a member');
      return;
    }

    if (selectedCounselor === selectedMember) {
      setError('Counselor cannot be assigned to themselves');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');

      const dto: CreateCounselorAssignmentDto = {
        counselorId: selectedCounselor,
        memberId: selectedMember,
        organizationId,
      };

      const response = await fetch(
        `/api/org-admin/counselor-assignments?organizationId=${organizationId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(dto),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create assignment');
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-2xl font-bold mb-4">Assign Counselor to Member</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Counselor
            </label>
            <select
              value={selectedCounselor}
              onChange={(e) => setSelectedCounselor(e.target.value)}
              className="w-full border border-gray-300 rounded-md p-2"
              required
            >
              <option value="">-- Select Counselor --</option>
              {counselors.map((counselor) => (
                <option key={counselor.user.id} value={counselor.user.id}>
                  {counselor.user.firstName} {counselor.user.lastName} ({counselor.user.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Member
            </label>
            <select
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
              className="w-full border border-gray-300 rounded-md p-2"
              required
            >
              <option value="">-- Select Member --</option>
              {members.map((member) => (
                <option key={member.user.id} value={member.user.id}>
                  {member.user.firstName} {member.user.lastName} ({member.user.email})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Assigning...' : 'Assign Counselor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
