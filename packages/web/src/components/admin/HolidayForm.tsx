'use client';

import React, { useState } from 'react';

interface HolidayFormProps {
  initialData?: {
    name: string;
    date: string;
    isRecurring: boolean;
  };
  onSubmit: (data: { name: string; date: string; isRecurring: boolean }) => Promise<void>;
  onCancel: () => void;
}

export function HolidayForm({ initialData, onSubmit, onCancel }: HolidayFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [date, setDate] = useState(initialData?.date || '');
  const [isRecurring, setIsRecurring] = useState(initialData?.isRecurring || false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (name.length < 3) {
      setError('Holiday name must be at least 3 characters');
      return;
    }

    if (!date) {
      setError('Date is required');
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit({ name, date, isRecurring });
      // Success - form will be closed by parent
    } catch (err) {
      setError('Failed to save holiday');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Holiday Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., New Year's Day, Christmas"
          required
          minLength={3}
          maxLength={100}
          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          disabled={submitting}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Date <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          disabled={submitting}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isRecurring"
          checked={isRecurring}
          onChange={(e) => setIsRecurring(e.target.checked)}
          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
          disabled={submitting}
        />
        <label htmlFor="isRecurring" className="text-sm text-gray-700">
          Recurring (applies to future years)
        </label>
      </div>

      <p className="text-xs text-gray-500">
        Recurring holidays will automatically apply to the same date every year.
      </p>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {submitting ? 'Saving...' : initialData ? 'Update Holiday' : 'Add Holiday'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
