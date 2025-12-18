'use client';

import { useState, useEffect, useCallback } from 'react';
import { SessionNote, CreateNoteRequest } from '@mychristiancounselor/shared';
import { apiGet, apiPost } from '../lib/api';
import { useTextToSpeech } from '../hooks/useTextToSpeech';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

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
  const [speakingNoteId, setSpeakingNoteId] = useState<string | null>(null);

  const { isSpeaking, isSupported, speak, stop } = useTextToSpeech();

  // Speech-to-text for note input
  const {
    transcript,
    isListening,
    isSupported: isSpeechSupported,
    startListening,
    stopListening,
  } = useSpeechRecognition();

  // Update note content when speech transcript changes
  useEffect(() => {
    if (transcript) {
      setNewNote(transcript);
    }
  }, [transcript]);

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

  const handleSpeak = (noteId: string, content: string) => {
    if (isSpeaking && speakingNoteId === noteId) {
      stop();
      setSpeakingNoteId(null);
    } else {
      speak(content);
      setSpeakingNoteId(noteId);
    }
  };

  // Reset speaking note ID when speech ends
  useEffect(() => {
    if (!isSpeaking) {
      setSpeakingNoteId(null);
    }
  }, [isSpeaking]);

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
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">
                  {new Date(note.createdAt).toLocaleString()}
                </span>
                {isSupported && (
                  <button
                    onClick={() => handleSpeak(note.id, note.content)}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                    title={speakingNoteId === note.id ? 'Stop' : 'Read aloud'}
                  >
                    {speakingNoteId === note.id && isSpeaking ? (
                      <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            </div>
            <p className="text-gray-700 whitespace-pre-wrap text-sm">{note.content}</p>
          </div>
        ))}
      </div>

      {/* Add Note Form */}
      {userRole !== 'viewer' && (
        <div className="border-t pt-4">
          <div className="relative">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add a note to this session... (Ctrl+Enter to submit)"
              className="w-full px-3 py-2 pr-12 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              maxLength={5000}
              disabled={loading}
            />
            {isSpeechSupported && (
              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                disabled={loading}
                className={`absolute right-2 top-2 p-2 rounded-full transition-colors ${
                  isListening
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                } disabled:opacity-50`}
                title={isListening ? 'Stop recording' : 'Start voice input'}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>

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
