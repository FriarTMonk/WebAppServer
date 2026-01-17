'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/AdminLayout';
import { BackButton } from '@/components/BackButton';
import { Breadcrumbs } from '@/components/Breadcrumbs';

interface Stats {
  total: number;
  enabled: number;
  disabled: number;
  emailMethod: number;
  totpMethod: number;
  enabledPercentage: number;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  twoFactorEnabled: boolean;
  twoFactorMethod: string | null;
  twoFactorEnabledAt: string | null;
}

export default function Admin2FAPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [filter, setFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697') + '/v1';
      const token = localStorage.getItem('accessToken');

      const enabledParam = filter === 'enabled' ? 'true' : filter === 'disabled' ? 'false' : '';

      const [statsRes, usersRes] = await Promise.all([
        fetch(`${apiUrl}/admin/security/2fa/stats`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`${apiUrl}/admin/security/2fa/users${enabledParam ? `?enabled=${enabledParam}` : ''}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
      ]);

      if (!statsRes.ok || !usersRes.ok) {
        if (statsRes.status === 401 || statsRes.status === 403 || usersRes.status === 401 || usersRes.status === 403) {
          router.push('/login?redirect=/admin/security/2fa');
          return;
        }
        throw new Error('Failed to load 2FA stats');
      }

      setStats(await statsRes.json());
      setUsers(await usersRes.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load 2FA stats');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6">Loading...</div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
            {error}
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-6">
          <BackButton />
        </div>

        <Breadcrumbs />

        <h1 className="text-3xl font-bold mb-6">Two-Factor Authentication Dashboard</h1>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-blue-600">{stats?.enabledPercentage}%</div>
            <div className="text-gray-600 text-sm">Adoption Rate</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-green-600">{stats?.enabled}</div>
            <div className="text-gray-600 text-sm">Enabled</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-blue-600">{stats?.totpMethod}</div>
            <div className="text-gray-600 text-sm">Using TOTP</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-orange-600">{stats?.emailMethod}</div>
            <div className="text-gray-600 text-sm">Using Email</div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded transition-colors ${
              filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            All Users ({stats?.total})
          </button>
          <button
            onClick={() => setFilter('enabled')}
            className={`px-4 py-2 rounded transition-colors ${
              filter === 'enabled' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            2FA Enabled ({stats?.enabled})
          </button>
          <button
            onClick={() => setFilter('disabled')}
            className={`px-4 py-2 rounded transition-colors ${
              filter === 'disabled' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            2FA Disabled ({stats?.disabled})
          </button>
        </div>

        {/* User Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Enabled At
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      {user.twoFactorEnabled ? (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                          Enabled
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-semibold">
                          Disabled
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {user.twoFactorMethod === 'totp'
                        ? 'Authenticator App'
                        : user.twoFactorMethod === 'email'
                        ? 'Email'
                        : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {user.twoFactorEnabledAt
                        ? new Date(user.twoFactorEnabledAt).toLocaleDateString()
                        : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
