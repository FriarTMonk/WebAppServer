'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { getAccessToken } from '../../lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';

export default function ProfilePage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    preferredTranslation: 'KJV',
    comparisonTranslations: ['ESV', 'NASB', 'NIV', 'NKJV'],
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    const fetchProfile = async () => {
      try {
        const token = getAccessToken();
        const response = await fetch(`${API_URL}/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setProfile(data);
          setFormData({
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            preferredTranslation: data.preferredTranslation || 'KJV',
            comparisonTranslations: data.comparisonTranslations || ['ESV', 'NASB', 'NIV', 'NKJV'],
          });
        }

        const orgResponse = await fetch(`${API_URL}/profile/organizations`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (orgResponse.ok) {
          const orgData = await orgResponse.json();
          setOrganizations(orgData);
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [isAuthenticated, router]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const token = getAccessToken();
      const response = await fetch(`${API_URL}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const updated = await response.json();
        setProfile(updated);
        setSuccess('Profile updated successfully');
        setIsEditing(false);
      } else {
        setError('Failed to update profile');
      }
    } catch (err) {
      setError('An error occurred while updating profile');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    try {
      const token = getAccessToken();
      const response = await fetch(`${API_URL}/profile/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      if (response.ok) {
        setSuccess('Password changed successfully');
        setIsChangingPassword(false);
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to change password');
      }
    } catch (err) {
      setError('An error occurred while changing password');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6">
          <button
            onClick={() => router.push('/')}
            className="text-blue-600 hover:text-blue-700 flex items-center gap-2"
          >
            ← Back to Home
          </button>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Profile</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Personal Information</h2>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Edit
              </button>
            )}
          </div>

          {!isEditing ? (
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600">Email</label>
                <p className="text-gray-900">{profile?.email}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">First Name</label>
                <p className="text-gray-900">{profile?.firstName || 'Not set'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Last Name</label>
                <p className="text-gray-900">{profile?.lastName || 'Not set'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Account Type</label>
                <p className="text-gray-900 capitalize">{profile?.accountType}</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setFormData({
                      firstName: profile?.firstName || '',
                      lastName: profile?.lastName || '',
                      preferredTranslation: profile?.preferredTranslation || 'KJV',
                      comparisonTranslations: profile?.comparisonTranslations || ['ESV', 'NASB', 'NIV', 'NKJV'],
                    });
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Bible Translation Preferences</h2>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Edit
              </button>
            )}
          </div>

          {!isEditing ? (
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600">Preferred Translation</label>
                <p className="text-gray-900">{profile?.preferredTranslation || 'KJV'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Comparison Translations</label>
                <p className="text-gray-900">
                  {profile?.comparisonTranslations?.join(', ') || 'ESV, NASB, NIV, NKJV'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preferred Translation
                </label>
                <select
                  value={formData.preferredTranslation}
                  onChange={(e) => setFormData({ ...formData, preferredTranslation: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="KJV">King James Version (KJV)</option>
                  <option value="ASV">American Standard Version (ASV)</option>
                  <option value="NIV">New International Version (NIV)</option>
                  <option value="ESV">English Standard Version (ESV)</option>
                  <option value="NASB">New American Standard Bible (NASB)</option>
                  <option value="NKJV">New King James Version (NKJV)</option>
                  <option value="NLT">New Living Translation (NLT)</option>
                  <option value="YLT">Young's Literal Translation (YLT)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comparison Translations (select multiple for comparison mode)
                </label>
                <div className="space-y-2">
                  {['KJV', 'ASV', 'NIV', 'ESV', 'NASB', 'NKJV', 'NLT', 'YLT'].map((translation) => (
                    <label key={translation} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.comparisonTranslations.includes(translation)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              comparisonTranslations: [...formData.comparisonTranslations, translation],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              comparisonTranslations: formData.comparisonTranslations.filter(
                                (t) => t !== translation
                              ),
                            });
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="text-gray-700">
                        {translation === 'KJV' && 'King James Version (KJV)'}
                        {translation === 'ASV' && 'American Standard Version (ASV)'}
                        {translation === 'NIV' && 'New International Version (NIV)'}
                        {translation === 'ESV' && 'English Standard Version (ESV)'}
                        {translation === 'NASB' && 'New American Standard Bible (NASB)'}
                        {translation === 'NKJV' && 'New King James Version (NKJV)'}
                        {translation === 'NLT' && 'New Living Translation (NLT)'}
                        {translation === 'YLT' && "Young's Literal Translation (YLT)"}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Password</h2>
            {!isChangingPassword && (
              <button
                onClick={() => setIsChangingPassword(true)}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Change Password
              </button>
            )}
          </div>

          {isChangingPassword ? (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, currentPassword: e.target.value })
                  }
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, newPassword: e.target.value })
                  }
                  required
                  minLength={8}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                  }
                  required
                  minLength={8}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Change Password
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsChangingPassword(false);
                    setPasswordData({
                      currentPassword: '',
                      newPassword: '',
                      confirmPassword: '',
                    });
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <p className="text-gray-600">Click "Change Password" to update your password</p>
          )}
        </div>

        {profile?.accountType === 'individual' && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Subscription</h2>
            <p className="text-gray-600 mb-4">
              Manage your subscription and billing information
            </p>
            <button
              onClick={() => router.push('/subscription')}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              View Subscription →
            </button>
          </div>
        )}

        {organizations.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Organizations</h2>
            <div className="space-y-3">
              {organizations.map((org) => (
                <div
                  key={org.organization.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => router.push(`/organization/${org.organization.id}`)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-900">{org.organization.name}</h3>
                      <p className="text-sm text-gray-600">{org.role.name}</p>
                    </div>
                    <span className="text-xs text-gray-500">
                      Joined {new Date(org.joinedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
