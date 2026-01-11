'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { OrgAdminLayout } from '../../../../components/OrgAdminLayout';
import { BackButton } from '@/components/BackButton';
import { Breadcrumbs } from '@/components/Breadcrumbs';

interface Organization {
  id: string;
  name: string;
  matureContentThreshold: string;
  customBookIds: string[];
}

interface Book {
  id: string;
  title: string;
  author: string;
  visibilityTier: string;
}

export default function BookAccessSettingsPage() {
  const router = useRouter();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [matureContentThreshold, setMatureContentThreshold] = useState<string>('teen');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [customBooks, setCustomBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [_bookCount, setBookCount] = useState(0);

  useEffect(() => {
    fetchOrganizationSettings();
  }, []);

  useEffect(() => {
    if (organization) {
      setMatureContentThreshold(organization.matureContentThreshold);
      if (organization.customBookIds.length > 0) {
        fetchCustomBooks(organization.customBookIds);
      }
    }
  }, [organization]);

  useEffect(() => {
    if (matureContentThreshold) {
      fetchBookCount();
    }
  }, [matureContentThreshold]);

  const fetchOrganizationSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';

      // Get organization info
      const orgResponse = await fetch(`${apiUrl}/org-admin/organization`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!orgResponse.ok) {
        if (orgResponse.status === 401 || orgResponse.status === 403) {
          router.push('/login?redirect=/org-admin/settings/book-access');
          return;
        }
        throw new Error('Failed to fetch organization info');
      }

      const orgData = await orgResponse.json();

      // Get book settings
      const settingsResponse = await fetch(`${apiUrl}/org-admin/books/settings`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!settingsResponse.ok) {
        throw new Error('Failed to fetch book settings');
      }

      const settings = await settingsResponse.json();

      // Combine organization info with settings
      setOrganization({
        id: orgData.id,
        name: orgData.name,
        matureContentThreshold: settings.matureContentThreshold || 'teen',
        customBookIds: settings.customBookIds || [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomBooks = async (bookIds: string[]) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';
      const response = await fetch(`${apiUrl}/resources/books/by-ids`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bookIds }),
      });

      if (response.ok) {
        const books = await response.json();
        setCustomBooks(books);
      }
    } catch (err) {
      console.error('Failed to fetch custom books:', err);
    }
  };

  const fetchBookCount = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';
      const response = await fetch(`${apiUrl}/resources/books/count?matureThreshold=${matureContentThreshold}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setBookCount(data.count);
      }
    } catch (err) {
      console.error('Failed to fetch book count:', err);
    }
  };

  const handleSearchBooks = async () => {
    if (!searchQuery.trim()) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';
      const response = await fetch(`${apiUrl}/resources/books/search?q=${encodeURIComponent(searchQuery)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.ok) {
        const books = await response.json();
        setSearchResults(books);
      }
    } catch (err) {
      console.error('Failed to search books:', err);
    }
  };

  const handleAddCustomBook = (book: Book) => {
    if (!organization) return;

    if (!organization.customBookIds.includes(book.id)) {
      setOrganization({
        ...organization,
        customBookIds: [...organization.customBookIds, book.id],
      });
      setCustomBooks([...customBooks, book]);
    }

    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRemoveCustomBook = (bookId: string) => {
    if (!organization) return;

    setOrganization({
      ...organization,
      customBookIds: organization.customBookIds.filter((id) => id !== bookId),
    });
    setCustomBooks(customBooks.filter((book) => book.id !== bookId));
  };

  const handleSave = async () => {
    if (!organization) return;

    try {
      setSaving(true);
      setError(null);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';
      const response = await fetch(`${apiUrl}/org-admin/books/settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          matureContentThreshold: matureContentThreshold,
          customBookIds: organization.customBookIds,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      alert('Book access settings saved successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      alert(`Failed to save settings: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <OrgAdminLayout>
      <div>
        <Breadcrumbs />
        <BackButton />
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Book Access Settings</h2>

        {loading && (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading settings...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">Error: {error}</p>
          </div>
        )}

        {!loading && organization && (
          <>
            {/* Mature Content Visibility Section */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="text-xl font-semibold mb-4">Mature Content Visibility</h3>
              <p className="text-sm text-gray-600 mb-4">
                Select the minimum account type required to view books with mature content. This setting determines which members can see books flagged as mature content.
              </p>
              <p className="text-sm text-gray-500 mb-4 italic">
                Note: Book alignment (Aligned, Somewhat Aligned, Not Aligned) is automatically managed and not configurable here.
              </p>

              <div className="space-y-3">
                <label className="flex items-center p-3 border rounded hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="matureContentThreshold"
                    value="child"
                    checked={matureContentThreshold === 'child'}
                    onChange={(e) => setMatureContentThreshold(e.target.value)}
                    className="h-4 w-4 text-blue-600 border-gray-300"
                  />
                  <div className="ml-3">
                    <div className="text-sm font-medium text-gray-900">Child (Most Permissive)</div>
                    <div className="text-xs text-gray-500">All members including children can see mature content books</div>
                  </div>
                </label>

                <label className="flex items-center p-3 border rounded hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="matureContentThreshold"
                    value="teen"
                    checked={matureContentThreshold === 'teen'}
                    onChange={(e) => setMatureContentThreshold(e.target.value)}
                    className="h-4 w-4 text-blue-600 border-gray-300"
                  />
                  <div className="ml-3">
                    <div className="text-sm font-medium text-gray-900">Teen (Recommended)</div>
                    <div className="text-xs text-gray-500">Only teen and adult members can see mature content books</div>
                  </div>
                </label>

                <label className="flex items-center p-3 border rounded hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="matureContentThreshold"
                    value="adult"
                    checked={matureContentThreshold === 'adult'}
                    onChange={(e) => setMatureContentThreshold(e.target.value)}
                    className="h-4 w-4 text-blue-600 border-gray-300"
                  />
                  <div className="ml-3">
                    <div className="text-sm font-medium text-gray-900">Adult (Most Restrictive)</div>
                    <div className="text-xs text-gray-500">Only adult members can see mature content books</div>
                  </div>
                </label>
              </div>

              <div className="mt-4 bg-blue-50 border border-blue-200 rounded p-3">
                <p className="text-sm text-blue-800">
                  <strong>Current Setting:</strong> Books with mature content will be visible to <strong>{matureContentThreshold}</strong> level members and above
                  {customBooks.length > 0 && `, plus ${customBooks.length} custom books that bypass this filter`}.
                </p>
              </div>
            </div>

            {/* Custom Books Section */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="text-xl font-semibold mb-4">Custom Book Access</h3>
              <p className="text-sm text-gray-600 mb-4">
                Add specific books that should be accessible to all members regardless of the mature content threshold setting above.
              </p>

              {/* Search */}
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearchBooks()}
                  placeholder="Search for books to add..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded"
                />
                <button
                  onClick={handleSearchBooks}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Search
                </button>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="mb-4 border rounded max-h-60 overflow-y-auto">
                  {searchResults.map((book) => (
                    <div key={book.id} className="flex justify-between items-center p-3 border-b last:border-b-0 hover:bg-gray-50">
                      <div>
                        <p className="font-medium text-gray-900">{book.title}</p>
                        <p className="text-sm text-gray-500">{book.author}</p>
                      </div>
                      <button
                        onClick={() => handleAddCustomBook(book)}
                        className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                        disabled={organization.customBookIds.includes(book.id)}
                      >
                        {organization.customBookIds.includes(book.id) ? 'Added' : 'Add'}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Custom Books List */}
              {customBooks.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700 mb-2">Custom Books ({customBooks.length})</p>
                  {customBooks.map((book) => (
                    <div key={book.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium text-gray-900">{book.title}</p>
                        <p className="text-sm text-gray-500">{book.author}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveCustomBook(book.id)}
                        className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No custom books added yet</p>
              )}
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className={`px-6 py-2 rounded-lg font-medium ${
                  saving
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </>
        )}
      </div>
    </OrgAdminLayout>
  );
}
