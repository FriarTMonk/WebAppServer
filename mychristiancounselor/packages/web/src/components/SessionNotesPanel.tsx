'use client';

import { useState, useEffect, useCallback } from 'react';
import { SessionNote, CreateNoteRequest } from '@mychristiancounselor/shared';
import { apiGet, apiPost } from '../lib/api';

interface SessionNotesPanelProps {
  sessionId: string;
  /** Reserved for future use: filtering notes by user, displaying author badges */
  currentUserId: string;
  userRole: 'user' | 'counselor' | 'viewer';
  /** Reserved for future use: authenticated note access via share links */
  shareToken?: string;
}

export function SessionNotesPanel({
  sessionId,
  currentUserId,
  userRole,
  shareToken
}: SessionNotesPanelProps) {
  const [notes, setNotes] = useState<SessionNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotes = useCallback(async () => {
    try {
      const response = await apiGet(`/counsel/notes/${sessionId}`);

      if (response.ok) {
        const data = await response.json();
        setNotes(data.notes);
        setError(null);
      } else if (response.status === 404) {
        // 404 means no notes yet - not an error
        setNotes([]);
        setError(null);
      } else {
        throw new Error('Failed to load notes');
      }
    } catch (err: any) {
      console.error('Failed to fetch notes:', err);
      // Only show error for actual failures (500, network errors, etc.)
      setError('Failed to load notes');
    } finally {
      setInitialLoading(false);
    }
  }, [sessionId]);

  // Fetch notes on mount
  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    try {
      setLoading(true);
      setError(null);

      const payload: CreateNoteRequest = {
        content: newNote,
        isPrivate: isPrivate,
      };

      const response = await apiPost(`/counsel/notes/${sessionId}`, payload);

      if (response.ok) {
        const data = await response.json();
        setNotes([...notes, data.note]);
        setNewNote('');
        setIsPrivate(false);
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to add note');
      }
    } catch (err: any) {
      console.error('Failed to add note:', err);
      setError(err.message || 'Failed to add note');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleAddNote();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 h-full flex flex-col">
      <h3 className="text-lg font-semibold mb-4 text-gray-900">Session Notes</h3>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
          {error}
        </div>
      )}

      {/* Note List */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-6">
        {initialLoading ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            Loading notes...
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            No notes yet. Add the first note below.
          </div>
        ) : null}

        {notes.map(note => (
          <div
            key={note.id}
            className={`border rounded-lg p-3 ${
              note.isPrivate ? 'bg-yellow-50 border-yellow-200' : 'border-gray-200'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-gray-900">
                  {note.authorName}
                </span>
                {note.isPrivate && (
                  <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded">
                    Private
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-500">
                {new Date(note.createdAt).toLocaleString()}
              </span>
            </div>
            <p className="text-gray-700 whitespace-pre-wrap text-sm">{note.content}</p>
          </div>
        ))}
      </div>

      {/* Add Note Form */}
      {userRole !== 'viewer' && (
        <div className="border-t pt-4">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a note to this session... (Ctrl+Enter to submit)"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={3}
            maxLength={5000}
            disabled={loading}
          />

          <div className="flex justify-between items-center mt-2">
            <div className="flex items-center gap-4">
              {(userRole === 'counselor' || userRole === 'user') && (
                <label className="flex items-center text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                    className="mr-2"
                    disabled={loading}
                  />
                  Private note (member & counselor only)
                </label>
              )}
              <span className="text-xs text-gray-500">
                {newNote.length}/5000
              </span>
            </div>

            <button
              onClick={handleAddNote}
              disabled={loading || !newNote.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium"
            >
              {loading ? 'Adding...' : 'Add Note'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
