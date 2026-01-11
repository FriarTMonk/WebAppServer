'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { AuthGuard } from '../../components/AuthGuard';
import { getAccessToken } from '../../lib/auth';
import { TourButton } from '../../components/TourButton';
import { BackButton } from '../../components/BackButton';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';

function ProfilePageContent() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [counselorAssignments, setCounselorAssignments] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    birthDate: '',
    preferredTranslation: 'KJV',
    comparisonTranslations: ['ESV', 'NASB', 'NIV', 'NKJV'],
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
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
            birthDate: data.birthDate ? new Date(data.birthDate).toISOString().split('T')[0] : '',
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

        const counselorResponse = await fetch(`${API_URL}/profile/counselor-assignments`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (counselorResponse.ok) {
          const counselorData = await counselorResponse.json();
          setCounselorAssignments(counselorData);
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
        <BackButton />

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Profile</h1>
          <TourButton />
        </div>

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

        <div className="bg-white rounded-lg shadow p-6 mb-6" data-tour="personal-info">
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
                <label className="text-sm text-gray-600">Birth Date</label>
                <p className="text-gray-900">
                  {profile?.birthDate
                    ? new Date(profile.birthDate).toLocaleDateString()
                    : 'Not set'}
                </p>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Birth Date
                </label>
                <input
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
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
                      birthDate: profile?.birthDate ? new Date(profile.birthDate).toISOString().split('T')[0] : '',
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

        <div className="bg-white rounded-lg shadow p-6 mb-6" data-tour="bible-translation-prefs">
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

        <div className="bg-white rounded-lg shadow p-6 mb-6" data-tour="password-section">
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
          <div className="bg-white rounded-lg shadow p-6 mb-6" data-tour="subscription-section">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Subscription</h2>
            <p className="text-gray-600 mb-4">
              Manage your subscription and billing information
            </p>
            <button
              onClick={() => router.push('/settings/subscription')}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              View Subscription →
            </button>
          </div>
        )}

        {organizations.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6" data-tour="organizations-section">
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

        {counselorAssignments.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6" data-tour="counselors-section">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">My Counselors</h2>
            <p className="text-sm text-gray-600 mb-4">
              Counselors who have been assigned to work with you across your organizations.
            </p>
            <div className="space-y-3">
              {counselorAssignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">{assignment.counselor.name}</h3>
                      <p className="text-sm text-gray-600">{assignment.counselor.email}</p>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        assignment.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {assignment.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    <p className="font-medium">{assignment.organization.name}</p>
                    {assignment.organization.description && (
                      <p className="text-xs text-gray-500">{assignment.organization.description}</p>
                    )}
                  </div>
                  <div className="mt-2 flex gap-4 text-xs text-gray-500">
                    <span>Assigned: {new Date(assignment.assignedAt).toLocaleDateString()}</span>
                    {assignment.endedAt && (
                      <span>Ended: {new Date(assignment.endedAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Danger Zone - Account Deletion */}
        <div className="bg-red-50 border border-red-200 rounded-lg shadow p-6 mb-6" data-tour="danger-zone">
          <h2 className="text-xl font-semibold text-red-900 mb-4">Danger Zone</h2>
          <p className="text-red-800 mb-4">
            Once you delete your account, there is no going back. Your account will be deactivated immediately and permanently deleted after 30 days.
          </p>
          <button
            onClick={() => {
              if (confirm('Are you sure you want to delete your account? This action cannot be undone.\n\nYour account will be deactivated immediately and permanently deleted after 30 days.\n\nYou can contact support within 30 days to cancel the deletion.')) {
                const password = prompt('Please enter your password to confirm account deletion:');
                if (password) {
                  handleDeleteAccount(password);
                }
              }
            }}
            className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium"
          >
            Delete My Account
          </button>
        </div>
      </div>
    </div>
  );

  async function handleDeleteAccount(password: string) {
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_URL}/profile`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Account deletion requested successfully.\n\n${data.message}\n\nDeletion Date: ${new Date(data.deletionDate).toLocaleDateString()}\n\n${data.note}`);
        // Log out user
        router.push('/');
      } else {
        const error = await response.json();
        alert(`Failed to delete account: ${error.message}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  }
}

export default function ProfilePage() {
  return (
    <AuthGuard requireAuth redirectTo="/login">
      <ProfilePageContent />
    </AuthGuard>
  );
}
