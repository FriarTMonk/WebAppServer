'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { OrgAdminLayout } from '../../../components/OrgAdminLayout';
import { UserManagementModal } from '../../../components/UserManagementModal';
import { InviteMemberModal } from '../../../components/InviteMemberModal';
import { useAuth } from '../../../contexts/AuthContext';
import type { AdminOrganizationMember as OrganizationMember } from '@mychristiancounselor/shared';

interface Role {
  id: string;
  name: string;
}

interface OrganizationInfo {
  id: string;
  name: string;
}

interface PendingInvitation {
  id: string;
  email: string;
  roleId: string;
  invitedById: string;
  token: string;
  expiresAt: string;
  createdAt: string;
  invitedBy: {
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
}

export default function OrgAdminMembersPage() {
  const router = useRouter();
  const { refreshAuth } = useAuth();
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [organization, setOrganization] = useState<OrganizationInfo | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedMember, setSelectedMember] = useState<OrganizationMember | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';
      const token = localStorage.getItem('accessToken');

      // Fetch organization info
      const orgResponse = await fetch(`${apiUrl}/org-admin/organization`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!orgResponse.ok) {
        if (orgResponse.status === 401 || orgResponse.status === 403) {
          router.push('/login?redirect=/org-admin/members');
          return;
        }
        throw new Error('Failed to fetch organization info');
      }

      const orgData = await orgResponse.json();
      setOrganization(orgData);

      // Fetch members
      const membersResponse = await fetch(`${apiUrl}/org-admin/members`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!membersResponse.ok) {
        if (membersResponse.status === 401 || membersResponse.status === 403) {
          router.push('/login?redirect=/org-admin/members');
          return;
        }
        throw new Error('Failed to fetch members');
      }

      const membersData = await membersResponse.json();
      setMembers(membersData.members || []);

      // Fetch actual roles for the organization
      const rolesResponse = await fetch(`${apiUrl}/organizations/${orgData.id}/roles`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (rolesResponse.ok) {
        const rolesData = await rolesResponse.json();
        setRoles(rolesData.map((role: any) => ({
          id: role.id,
          name: role.name,
        })));
      } else {
        console.error('Failed to fetch roles:', rolesResponse.status);
        // Fallback to empty array
        setRoles([]);
      }

      // Fetch pending invitations
      const invitationsResponse = await fetch(`${apiUrl}/organizations/${orgData.id}/invitations`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (invitationsResponse.ok) {
        const invitationsData = await invitationsResponse.json();
        setPendingInvitations(invitationsData || []);
      } else {
        console.error('Failed to fetch invitations:', invitationsResponse.status);
        setPendingInvitations([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getRoleName = (roleId: string): string => {
    const role = roles.find(r => r.id === roleId);
    return role?.name || 'Unknown';
  };

  const handleMemberClick = (member: OrganizationMember) => {
    setSelectedMember(member);
    setShowUserModal(true);
  };

  const handleUpdateRole = async (userId: string, newRoleId: string) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';
    const token = localStorage.getItem('accessToken');

    const response = await fetch(
      `${apiUrl}/org-admin/members/${userId}/role`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roleId: newRoleId }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update role');
    }

    await fetchData();
  };

  const handleResetPassword = async (userId: string, newPassword: string) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';
    const token = localStorage.getItem('accessToken');

    const response = await fetch(`${apiUrl}/org-admin/users/${userId}/reset-password`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ newPassword }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to reset password');
    }
  };

  const handleMorph = async (userId: string) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';
    const token = localStorage.getItem('accessToken');

    const response = await fetch(`${apiUrl}/org-admin/morph/start/${userId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to morph into user');
    }

    const data = await response.json();
    localStorage.setItem('accessToken', data.accessToken);
    // Store current page for return when morph session ends
    const returnUrl = window.location.pathname;
    console.log('[MORPH START] Storing return URL:', returnUrl);
    localStorage.setItem('morphReturnUrl', returnUrl);

    // Refresh auth state to update user and morphSession
    await refreshAuth();

    router.push('/');
  };

  const handleRelease = async (userId: string) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';
    const token = localStorage.getItem('accessToken');

    const response = await fetch(`${apiUrl}/org-admin/members/${userId}/release`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to release member');
    }

    // Refresh the members list
    await fetchData();
  };

  return (
    <OrgAdminLayout organizationName={organization?.name}>
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-gray-900">Organization Members</h2>
          <button
            onClick={() => setShowInviteModal(true)}
            disabled={loading || !organization}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Invite Member
          </button>
        </div>

        {loading && (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading members...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">Error: {error}</p>
            <button
              onClick={fetchData}
              className="mt-2 text-sm text-red-600 hover:underline"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && pendingInvitations.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Pending Invitations</h3>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Invited By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Expires
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pendingInvitations.map((invitation) => {
                    const isExpiringSoon = new Date(invitation.expiresAt).getTime() - Date.now() < 24 * 60 * 60 * 1000;
                    return (
                      <tr key={invitation.id} className={isExpiringSoon ? 'bg-yellow-50' : ''}>
                        <td className="px-6 py-4 text-sm text-gray-900">{invitation.email}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            {getRoleName(invitation.roleId)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {invitation.invitedBy.firstName && invitation.invitedBy.lastName
                            ? `${invitation.invitedBy.firstName} ${invitation.invitedBy.lastName}`
                            : invitation.invitedBy.email}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(invitation.expiresAt).toLocaleDateString()}
                          {isExpiringSoon && (
                            <span className="ml-2 text-xs text-yellow-600">(expires soon)</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && !error && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {members.map((member) => (
                  <tr
                    key={member.userId}
                    onClick={() => handleMemberClick(member)}
                    className="cursor-pointer hover:bg-green-50"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {member.firstName || member.lastName
                        ? `${member.firstName || ''} ${member.lastName || ''}`.trim()
                        : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {member.email}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        {member.roleName || 'Member'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(member.joinedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {members.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No members found</p>
              </div>
            )}
          </div>
        )}
      </div>

      {showUserModal && selectedMember && (
        <UserManagementModal
          member={selectedMember}
          organizationId={organization?.id || ''}
          availableRoles={roles}
          onClose={() => {
            setShowUserModal(false);
            setSelectedMember(null);
          }}
          onUpdateRole={handleUpdateRole}
          onResetPassword={handleResetPassword}
          onMorph={handleMorph}
          onRelease={handleRelease}
          isPlatformAdmin={false}
        />
      )}

      {showInviteModal && organization && (
        <InviteMemberModal
          organizationId={organization.id}
          availableRoles={roles}
          onClose={() => setShowInviteModal(false)}
          onInviteSent={() => {
            // Refresh data to show updated member list
            fetchData();
          }}
        />
      )}
    </OrgAdminLayout>
  );
}
