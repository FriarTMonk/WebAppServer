'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { BackButton } from '@/components/BackButton';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { apiFetch } from '@/lib/api';
import { showToast } from '@/components/Toast';

interface WellnessEntry {
  id: string;
  date: string;
  moodRating: number | null;
  sleepHours: number | null;
  exerciseMinutes: number | null;
  notes: string | null;
}

export default function WellnessEntryPage() {
  const searchParams = useSearchParams();
  const dateParam = searchParams?.get('date');

  const [date, setDate] = useState(() => {
    if (dateParam) return dateParam;
    return new Date().toISOString().split('T')[0];
  });

  const [moodRating, setMoodRating] = useState<number | ''>('');
  const [sleepHours, setSleepHours] = useState<number | ''>('');
  const [exerciseMinutes, setExerciseMinutes] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [existingEntry, setExistingEntry] = useState<WellnessEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchEntry(date);
  }, [date]);

  const fetchEntry = async (selectedDate: string) => {
    setLoading(true);
    try {
      const response = await apiFetch(`/resources/wellness-entries/${selectedDate}`);
      if (response.ok) {
        const entry: WellnessEntry = await response.json();
        setExistingEntry(entry);
        setMoodRating(entry.moodRating ?? '');
        setSleepHours(entry.sleepHours ?? '');
        setExerciseMinutes(entry.exerciseMinutes ?? '');
        setNotes(entry.notes ?? '');
      } else {
        // No entry for this date
        setExistingEntry(null);
        setMoodRating('');
        setSleepHours('');
        setExerciseMinutes('');
        setNotes('');
      }
    } catch (error) {
      console.error('Failed to fetch entry:', error);
      // Entry doesn't exist, that's okay
      setExistingEntry(null);
      setMoodRating('');
      setSleepHours('');
      setExerciseMinutes('');
      setNotes('');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        date,
        moodRating: moodRating === '' ? null : Number(moodRating),
        sleepHours: sleepHours === '' ? null : Number(sleepHours),
        exerciseMinutes: exerciseMinutes === '' ? null : Number(exerciseMinutes),
        notes: notes.trim() || null,
      };

      let response;
      if (existingEntry) {
        // Update existing entry
        response = await apiFetch(`/resources/wellness-entries/${date}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        // Create new entry
        response = await apiFetch('/resources/wellness-entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (response.ok) {
        showToast('Wellness entry saved successfully', 'success');
        await fetchEntry(date); // Refresh to get updated data
      } else {
        const error = await response.json();
        showToast(error.message || 'Failed to save wellness entry', 'error');
      }
    } catch (error) {
      console.error('Failed to save entry:', error);
      showToast('Failed to save wellness entry', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!existingEntry) return;
    if (!confirm('Are you sure you want to delete this wellness entry?')) return;

    setSaving(true);
    try {
      const response = await apiFetch(`/resources/wellness-entries/${date}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        showToast('Wellness entry deleted successfully', 'success');
        setExistingEntry(null);
        setMoodRating('');
        setSleepHours('');
        setExerciseMinutes('');
        setNotes('');
      } else {
        showToast('Failed to delete wellness entry', 'error');
      }
    } catch (error) {
      console.error('Failed to delete entry:', error);
      showToast('Failed to delete wellness entry', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <BackButton />
      </div>

      <Breadcrumbs />

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Wellness Entry</h1>
        <p className="text-gray-600 mt-2">
          Track your daily mood, sleep, and exercise
        </p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <div className="space-y-6">
          {/* Date Selector */}
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="date"
              id="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : (
            <>
              {/* Mood Rating */}
              <div>
                <label htmlFor="mood" className="block text-sm font-medium text-gray-700 mb-1">
                  Mood Rating (1-10)
                </label>
                <input
                  type="number"
                  id="mood"
                  min="1"
                  max="10"
                  value={moodRating}
                  onChange={(e) => setMoodRating(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Rate your mood from 1 (poor) to 10 (excellent)"
                  className="w-full border rounded px-3 py-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  1 = Very Poor, 5 = Neutral, 10 = Excellent
                </p>
              </div>

              {/* Sleep Hours */}
              <div>
                <label htmlFor="sleep" className="block text-sm font-medium text-gray-700 mb-1">
                  Sleep Hours
                </label>
                <input
                  type="number"
                  id="sleep"
                  min="0"
                  max="24"
                  step="0.5"
                  value={sleepHours}
                  onChange={(e) => setSleepHours(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Hours of sleep"
                  className="w-full border rounded px-3 py-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter total hours of sleep (0-24)
                </p>
              </div>

              {/* Exercise Minutes */}
              <div>
                <label htmlFor="exercise" className="block text-sm font-medium text-gray-700 mb-1">
                  Exercise Minutes
                </label>
                <input
                  type="number"
                  id="exercise"
                  min="0"
                  max="1440"
                  value={exerciseMinutes}
                  onChange={(e) => setExerciseMinutes(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Minutes of exercise"
                  className="w-full border rounded px-3 py-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter total minutes of exercise/physical activity
                </p>
              </div>

              {/* Notes */}
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  id="notes"
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional notes about your day..."
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {saving ? 'Saving...' : existingEntry ? 'Update Entry' : 'Save Entry'}
                </button>

                {existingEntry && (
                  <button
                    onClick={handleDelete}
                    disabled={saving}
                    className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400"
                  >
                    Delete Entry
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-6 bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
        <h3 className="text-sm font-semibold text-blue-800 mb-2">Tip</h3>
        <p className="text-sm text-blue-700">
          Track your wellness daily to see trends over time. Visit the{' '}
          <a href="/resources/wellness/charts" className="underline hover:text-blue-900">
            Wellness Charts
          </a>{' '}
          page to visualize your progress.
        </p>
      </div>
    </div>
  );
}
