'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '../../../components/AdminLayout';
import { UserManagementModal } from '../../../components/UserManagementModal';
import { useAuth } from '../../../contexts/AuthContext';

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  accountType: string;
  emailVerified: boolean;
  isActive: boolean;
  createdAt: string;
  subscriptionStatus?: string;
  subscriptionTier?: string;
  organizationMemberships: Array<{
    organization: {
      id: string;
      name: string;
    };
  }>;
}

export default function UsersListPage() {
  const router = useRouter();
  const { refreshAuth } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [accountTypeFilter, setAccountTypeFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (accountTypeFilter) params.append('accountType', accountTypeFilter);
      if (activeFilter) params.append('isActive', activeFilter);

      const response = await fetch(`${apiUrl}/admin/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) {
        // Redirect to login on auth errors
        if (response.status === 401 || response.status === 403) {
          router.push('/login?redirect=/admin/users');
          return;
        }
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, accountTypeFilter, activeFilter, router]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const getFullName = (user: User) => {
    if (user.firstName || user.lastName) {
      return `${user.firstName || ''} ${user.lastName || ''}`.trim();
    }
    return 'N/A';
  };

  const handleUserClick = (user: User) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const handleResetPassword = async (userId: string, newPassword: string) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';
    const response = await fetch(`${apiUrl}/admin/users/${userId}/reset-password`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ newPassword }),
    });

    if (!response.ok) {
      throw new Error('Failed to reset password');
    }
  };

  const handleMorph = async (userId: string) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';
    const response = await fetch(`${apiUrl}/admin/morph/start/${userId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to morph into user');
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

  const handleUpdateSubscription = async (userId: string, subscriptionData: { subscriptionStatus: string; subscriptionTier?: string | null }) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';
    const response = await fetch(`${apiUrl}/admin/users/${userId}/subscription`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscriptionData),
    });

    if (!response.ok) {
      throw new Error('Failed to update subscription');
    }

    await fetchUsers();
  };

  const convertToOrganizationMember = (user: User): any => {
    return {
      id: user.id,
      userId: user.id,
      email: user.email,
      firstName: user.firstName || undefined,
      lastName: user.lastName || undefined,
      roleName: 'Platform User',
      roleId: 'platform-user',
      joinedAt: user.createdAt,
    };
  };

  return (
    <AdminLayout>
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Users</h2>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by email or name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account Type
              </label>
              <select
                value={accountTypeFilter}
                onChange={(e) => setAccountTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value="individual">Individual</option>
                <option value="organization">Organization</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {loading && (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading users...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">Error: {error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Verified
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Organizations
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr
                    key={user.id}
                    onClick={() => handleUserClick(user)}
                    className="cursor-pointer hover:bg-blue-50"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {getFullName(user)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        user.accountType === 'individual'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {user.accountType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {user.emailVerified ? (
                        <span className="text-green-600">✓</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        user.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {user.organizationMemberships.length > 0 ? (
                        <div className="space-y-1">
                          {user.organizationMemberships.map((membership) => (
                            <div key={membership.organization.id}>
                              {membership.organization.name}
                            </div>
                          ))}
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {users.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No users found</p>
              </div>
            )}
          </div>
        )}
      </div>

      {showUserModal && selectedUser && (
        <UserManagementModal
          member={convertToOrganizationMember(selectedUser)}
          organizationId="platform"
          availableRoles={[]}
          userSubscription={{
            subscriptionStatus: selectedUser.subscriptionStatus || 'none',
            subscriptionTier: selectedUser.subscriptionTier,
          }}
          onClose={() => {
            setShowUserModal(false);
            setSelectedUser(null);
          }}
          onUpdateRole={async () => {}}
          onResetPassword={handleResetPassword}
          onMorph={handleMorph}
          onUpdateSubscription={handleUpdateSubscription}
          isPlatformAdmin={true}
        />
      )}
    </AdminLayout>
  );
}
