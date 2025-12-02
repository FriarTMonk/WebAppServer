'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { HolidayForm } from '@/components/admin/HolidayForm';

interface Holiday {
  id: string;
  name: string;
  date: string;
  isRecurring: boolean;
  createdBy: {
    firstName: string;
    lastName: string;
  };
}

export default function HolidayManagementPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/admin/holidays');
      return;
    }

    loadHolidays();
  }, [isAuthenticated, router]);

  const loadHolidays = async () => {
    try {
      setLoading(true);
      const response = await apiGet('/admin/holidays');
      if (response.ok) {
        const data = await response.json();
        setHolidays(data);
      }
    } catch (error) {
      console.error('Error loading holidays:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (data: { name: string; date: string; isRecurring: boolean }) => {
    try {
      const response = await apiPost('/admin/holidays', data);
      if (response.ok) {
        setShowAddForm(false);
        await loadHolidays();
      } else {
        const error = await response.json();
        alert(`Failed to add holiday: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error adding holiday:', error);
      alert('Failed to add holiday');
    }
  };

  const handleEdit = async (data: { name: string; date: string; isRecurring: boolean }) => {
    if (!editingHoliday) return;

    try {
      const response = await apiPut(`/admin/holidays/${editingHoliday.id}`, data);
      if (response.ok) {
        setEditingHoliday(null);
        await loadHolidays();
      } else {
        const error = await response.json();
        alert(`Failed to update holiday: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating holiday:', error);
      alert('Failed to update holiday');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) {
      return;
    }

    try {
      const response = await apiDelete(`/admin/holidays/${id}`);
      if (response.ok) {
        await loadHolidays();
      } else {
        const error = await response.json();
        alert(`Failed to delete holiday: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting holiday:', error);
      alert('Failed to delete holiday');
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <p className="text-gray-600">Loading holidays...</p>
      </div>
    );
  }

  const isPastHoliday = (date: string) => {
    return new Date(date) < new Date();
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Holiday Management</h1>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Add Holiday
        </button>
      </div>

      <p className="text-sm text-gray-600 mb-6">
        Holidays are excluded from SLA business hours calculations (Mon-Fri 10 AM - 10 PM EST).
      </p>

      {/* Add Holiday Form */}
      {showAddForm && (
        <div className="mb-6 p-4 border border-gray-300 rounded bg-gray-50">
          <h2 className="text-lg font-semibold mb-4">Add New Holiday</h2>
          <HolidayForm
            onSubmit={handleAdd}
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      )}

      {/* Edit Holiday Form */}
      {editingHoliday && (
        <div className="mb-6 p-4 border border-gray-300 rounded bg-gray-50">
          <h2 className="text-lg font-semibold mb-4">Edit Holiday</h2>
          <HolidayForm
            initialData={{
              name: editingHoliday.name,
              date: editingHoliday.date.split('T')[0],
              isRecurring: editingHoliday.isRecurring,
            }}
            onSubmit={handleEdit}
            onCancel={() => setEditingHoliday(null)}
          />
        </div>
      )}

      {/* Holiday List */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Recurring
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Created By
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {holidays.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  No holidays configured. Add your first holiday to exclude it from SLA calculations.
                </td>
              </tr>
            ) : (
              holidays.map((holiday) => (
                <tr
                  key={holiday.id}
                  className={isPastHoliday(holiday.date) ? 'bg-gray-50 text-gray-500' : ''}
                >
                  <td className="px-4 py-3 text-sm">
                    {new Date(holiday.date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">{holiday.name}</td>
                  <td className="px-4 py-3 text-sm">
                    {holiday.isRecurring ? (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                        Yes
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                        No
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {holiday.createdBy.firstName} {holiday.createdBy.lastName}
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    <button
                      onClick={() => setEditingHoliday(holiday)}
                      className="text-blue-600 hover:text-blue-800 mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(holiday.id, holiday.name)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
