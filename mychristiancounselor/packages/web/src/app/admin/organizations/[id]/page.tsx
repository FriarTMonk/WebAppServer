'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { AdminLayout } from '../../../../components/AdminLayout';
import { OrganizationMembersView } from '../../../../components/OrganizationMembersView';
import { UserManagementModal } from '../../../../components/UserManagementModal';
import { OrganizationSubscriptionModal } from '../../../../components/OrganizationSubscriptionModal';
import { useAuth } from '../../../../contexts/AuthContext';
import { AdminOrganizationMember as OrganizationMember } from '@mychristiancounselor/shared';

interface Organization {
  id: string;
  name: string;
  maxMembers: number;
  licenseStatus: string;
  licenseType?: string | null;
  licenseExpiresAt?: string | null;
  currentMemberCount?: number;
}

interface Role {
  id: string;
  name: string;
}

export default function OrganizationDetailPage() {
  const router = useRouter();
  const { refreshAuth } = useAuth();
  const params = useParams();
  const organizationId = params?.id as string;

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedMember, setSelectedMember] = useState<OrganizationMember | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrganizationData = useCallback(async () => {
    if (!organizationId) return;

    try {
      setLoading(true);
      setError(null);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';
      const token = localStorage.getItem('accessToken');

      // Fetch organization members
      const membersResponse = await fetch(`${apiUrl}/admin/organizations/${organizationId}/members`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!membersResponse.ok) {
        if (membersResponse.status === 401 || membersResponse.status === 403) {
          router.push('/login?redirect=/admin/organizations');
          return;
        }
        throw new Error('Failed to fetch organization data');
      }

      const membersData = await membersResponse.json();
      setMembers(membersData.members || []);

      // Get organization details from first response or fetch separately
      // For now, we'll construct from members response
      if (membersData.organizationName) {
        // Mock organization object - in production, you might want a dedicated endpoint
        setOrganization({
          id: organizationId,
          name: membersData.organizationName,
          maxMembers: 0, // These would come from a dedicated org details endpoint
          licenseStatus: 'active',
          currentMemberCount: membersData.members?.length || 0,
        });
      }

      // Fetch actual roles for the organization
      const rolesResponse = await fetch(`${apiUrl}/organizations/${organizationId}/roles`, {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [organizationId, router]);

  useEffect(() => {
    fetchOrganizationData();
  }, [fetchOrganizationData]);

  const handleMemberClick = (member: OrganizationMember) => {
    setSelectedMember(member);
    setShowUserModal(true);
  };

  const handleUpdateRole = async (userId: string, newRoleId: string) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';
    const token = localStorage.getItem('accessToken');

    const response = await fetch(
      `${apiUrl}/admin/organizations/${organizationId}/members/${userId}/role`,
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

    // Refresh data
    await fetchOrganizationData();
  };

  const handleResetPassword = async (userId: string, newPassword: string) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';
    const token = localStorage.getItem('accessToken');

    const response = await fetch(`${apiUrl}/admin/users/${userId}/reset-password`, {
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

    const response = await fetch(`${apiUrl}/admin/morph/start/${userId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to start morph session');
    }

    const data = await response.json();

    // Update token and redirect
    localStorage.setItem('accessToken', data.accessToken);
    // Store current page for return when morph session ends
    const returnUrl = window.location.pathname;
    console.log('[MORPH START] Storing return URL:', returnUrl);
    localStorage.setItem('morphReturnUrl', returnUrl);

    // Refresh auth state to update user and morphSession
    await refreshAuth();

    router.push('/');
  };

  const handleUpdateSubscription = async (
    userId: string,
    subscriptionData: { subscriptionStatus: string; subscriptionTier?: string | null }
  ) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';
    const token = localStorage.getItem('accessToken');

    const response = await fetch(`${apiUrl}/admin/users/${userId}/subscription`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscriptionData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update subscription');
    }
  };

  const handleUpdateOrgSubscription = async (
    orgId: string,
    subscriptionData: {
      maxMembers?: number;
      licenseStatus?: string;
      licenseType?: string;
      licenseExpiresAt?: string | null;
    }
  ) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';
    const token = localStorage.getItem('accessToken');

    const response = await fetch(`${apiUrl}/admin/organizations/${orgId}/subscription-limit`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscriptionData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update organization subscription');
    }

    // Refresh data
    await fetchOrganizationData();
  };

  return (
    <AdminLayout>
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <button
              onClick={() => router.push('/admin/organizations')}
              className="text-blue-600 hover:underline mb-2 text-sm"
            >
              ← Back to Organizations
            </button>
            <h2 className="text-3xl font-bold text-gray-900">
              {organization?.name || 'Organization Details'}
            </h2>
          </div>
          <button
            onClick={() => setShowSubscriptionModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            Manage Subscription
          </button>
        </div>

        {loading && (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading organization data...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">Error: {error}</p>
            <button
              onClick={fetchOrganizationData}
              className="mt-2 text-sm text-red-600 hover:underline"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && members.length > 0 && (
          <OrganizationMembersView
            members={members}
            organizationId={organizationId}
            organizationName={organization?.name || 'Organization'}
            isPlatformAdmin={true}
            onMemberClick={handleMemberClick}
          />
        )}

        {!loading && !error && members.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No members found in this organization.</p>
          </div>
        )}

        {/* User Management Modal */}
        {showUserModal && selectedMember && (
          <UserManagementModal
            member={selectedMember}
            organizationId={organizationId}
            isPlatformAdmin={true}
            availableRoles={roles}
            onClose={() => {
              setShowUserModal(false);
              setSelectedMember(null);
            }}
            onUpdateRole={handleUpdateRole}
            onResetPassword={handleResetPassword}
            onMorph={handleMorph}
            onUpdateSubscription={handleUpdateSubscription}
          />
        )}

        {/* Organization Subscription Modal */}
        {showSubscriptionModal && organization && (
          <OrganizationSubscriptionModal
            organization={organization}
            onClose={() => setShowSubscriptionModal(false)}
            onUpdateSubscription={handleUpdateOrgSubscription}
          />
        )}
      </div>
    </AdminLayout>
  );
}
