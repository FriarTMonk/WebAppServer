'use client';

import React, { useState, useEffect } from 'react';
import { Message, SessionNote, User } from '@mychristiancounselor/shared';
import { getAccessToken } from '../lib/auth';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';

// Simplified structure from export endpoint (not the full Message.scriptureReferences structure)
interface ScriptureReference {
  reference: string;
  text: string;
}

interface SessionExportData {
  session: {
    id: string;
    title: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    user?: Pick<User, 'firstName' | 'lastName' | 'email'>;
  };
  messages: Message[];
  notes: SessionNote[];
  scriptureReferences: ScriptureReference[];
}

interface SessionExportViewProps {
  sessionId: string;
}

export function SessionExportView({ sessionId }: SessionExportViewProps) {
  const [data, setData] = useState<SessionExportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPrivateNotes, setShowPrivateNotes] = useState(false);

  useEffect(() => {
    const fetchExportData = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = getAccessToken();
        if (!token) {
          setError('You must be logged in to view session exports');
          setLoading(false);
          return;
        }

        const response = await axios.get(`${API_URL}/counsel/export/${sessionId}`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 30000, // 30 seconds
        });

        setData(response.data);
      } catch (err: any) {
        console.error('Error fetching export data:', err);

        if (err.response?.status === 404) {
          setError('Session not found');
        } else if (err.response?.status === 403) {
          setError('Access denied: You do not have permission to view this session');
        } else {
          setError(err.response?.data?.message || 'Failed to load session data');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchExportData();
  }, [sessionId]);

  const formatDate = (date: string | Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTimestamp = (date: string | Date): string => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getUserDisplayName = (): string => {
    if (!data?.session.user) return 'Anonymous User';
    const { firstName, lastName } = data.session.user;
    if (firstName && lastName) return `${firstName} ${lastName}`;
    if (firstName) return firstName;
    if (lastName) return lastName;
    return data.session.user.email;
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="text-center py-12" role="status" aria-live="polite">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading session data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center" role="alert">
          <h2 className="text-xl font-semibold text-red-900 mb-2">Error</h2>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 print:max-w-none print:px-0 print:py-0">
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          body {
            background: white !important;
          }

          .page-break-after {
            page-break-after: always;
          }

          .page-break-before {
            page-break-before: always;
          }

          .avoid-break {
            page-break-inside: avoid;
          }

          .print\\:text-black {
            color: black !important;
          }

          .print\\:bg-white {
            background-color: white !important;
          }

          .print\\:border-gray-400 {
            border-color: #9ca3af !important;
          }
        }
      `}</style>

      <div className="no-print fixed top-4 right-4 z-50 flex flex-col gap-2 items-end">
        <button
          onClick={() => window.print()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-blue-700"
          aria-label="Print session"
        >
          🖨️ Print
        </button>

        {data.notes.some(note => note.isPrivate) && (
          <label className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-lg text-sm cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={showPrivateNotes}
              onChange={(e) => setShowPrivateNotes(e.target.checked)}
              className="w-4 h-4 cursor-pointer"
            />
            <span className="text-gray-700">Show Private Notes</span>
          </label>
        )}
      </div>

      <main>
        {/* Header */}
        <header className="avoid-break mb-8 print:mb-6">
        <div className="text-center border-b-2 border-gray-300 pb-6 print:pb-4">
          <h1 className="text-3xl font-bold text-gray-900 print:text-black mb-2">
            MyChristianCounselor
          </h1>
          <p className="text-gray-600 print:text-black text-sm">
            Session Export - Biblical Guidance Record
          </p>
        </div>

        {/* Session Information */}
        <div className="mt-6 print:mt-4 bg-gray-50 print:bg-white border border-gray-200 print:border-gray-400 rounded-lg p-4 avoid-break">
          <h2 className="text-lg font-semibold text-gray-900 print:text-black mb-3">
            Session Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="font-medium text-gray-700 print:text-black">Session Title:</span>
              <span className="ml-2 text-gray-900 print:text-black">{data.session.title}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700 print:text-black">Participant:</span>
              <span className="ml-2 text-gray-900 print:text-black">{getUserDisplayName()}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700 print:text-black">Created:</span>
              <span className="ml-2 text-gray-900 print:text-black">
                {formatDate(data.session.createdAt)}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700 print:text-black">Last Updated:</span>
              <span className="ml-2 text-gray-900 print:text-black">
                {formatDate(data.session.updatedAt)}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Conversation */}
      <section className="mb-8 print:mb-6">
        <div className="border-b-2 border-gray-300 mb-4 pb-2">
          <h2 className="text-2xl font-bold text-gray-900 print:text-black">Conversation</h2>
        </div>

        <div className="space-y-4">
          {data.messages.length === 0 ? (
            <p className="text-gray-500 print:text-black text-center py-4">
              No messages in this session.
            </p>
          ) : (
            data.messages.map((message, index) => (
              <div
                key={message.id}
                className={`avoid-break border rounded-lg p-4 print:border-gray-400 ${
                  message.role === 'user'
                    ? 'bg-blue-50 border-blue-200 print:bg-white'
                    : message.role === 'assistant'
                    ? 'bg-green-50 border-green-200 print:bg-white'
                    : 'bg-gray-50 border-gray-200 print:bg-white'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-semibold text-sm text-gray-900 print:text-black uppercase">
                    {message.role === 'assistant' ? 'Counselor' : message.role}
                  </span>
                  <span className="text-xs text-gray-600 print:text-black">
                    {formatTimestamp(message.timestamp)}
                  </span>
                </div>
                <div className="text-gray-800 print:text-black whitespace-pre-wrap leading-relaxed">
                  {message.content}
                </div>

                {/* Scripture References in Message */}
                {message.scriptureReferences && message.scriptureReferences.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-300 print:border-gray-400">
                    <p className="text-xs font-semibold text-gray-700 print:text-black mb-2">
                      Scripture References:
                    </p>
                    <div className="space-y-2">
                      {message.scriptureReferences.map((ref, refIndex) => (
                        <div key={refIndex} className="text-sm">
                          <span className="font-medium text-gray-900 print:text-black">
                            {ref.book} {ref.chapter}:{ref.verseStart}
                            {ref.verseEnd && ref.verseEnd !== ref.verseStart && `-${ref.verseEnd}`}
                            {' '}({ref.translation})
                          </span>
                          <p className="text-gray-700 print:text-black italic ml-2 mt-1">
                            "{ref.text}"
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      {/* Session Notes */}
      {data.notes.length > 0 && (
        <section className="mb-8 print:mb-6 page-break-before">
          <div className="border-b-2 border-gray-300 mb-4 pb-2">
            <h2 className="text-2xl font-bold text-gray-900 print:text-black">Session Notes</h2>
          </div>

          <div className="space-y-3">
            {data.notes.filter(note => !note.isPrivate || showPrivateNotes).map((note) => (
              <div
                key={note.id}
                className={`avoid-break border rounded-lg p-4 print:border-gray-400 ${
                  note.isPrivate
                    ? 'bg-yellow-50 border-yellow-200 print:bg-white print:border-gray-400 private-note'
                    : 'bg-white border-gray-200 print:border-gray-400'
                }`}
              >
                <div className="flex justify-between items-start mb-2 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold text-sm text-gray-900 ${note.isPrivate ? 'print:text-gray-500' : 'print:text-black'}`}>
                      {note.authorName}
                    </span>
                    <span className={`text-xs text-gray-600 ${note.isPrivate ? 'print:text-gray-400' : 'print:text-black'}`}>
                      ({note.authorRole})
                    </span>
                    {note.isPrivate && (
                      <span className="text-xs bg-yellow-200 print:bg-white border print:border-gray-400 text-yellow-900 print:text-gray-500 px-2 py-1 rounded font-medium">
                        Private
                      </span>
                    )}
                  </div>
                  <span className={`text-xs text-gray-600 ${note.isPrivate ? 'print:text-gray-400' : 'print:text-black'}`}>
                    {formatTimestamp(note.createdAt)}
                  </span>
                </div>
                <p className={`text-gray-800 whitespace-pre-wrap leading-relaxed ${note.isPrivate ? 'print:text-gray-500' : 'print:text-black'}`}>
                  {note.content}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Scripture References Summary */}
      {/* Note: This section currently shows placeholder text until Bible API integration is complete */}
      {data.scriptureReferences.length > 0 && (
        <section className="mb-8 print:mb-6 page-break-before">
          <div className="border-b-2 border-gray-300 mb-4 pb-2">
            <h2 className="text-2xl font-bold text-gray-900 print:text-black">
              Scripture References
            </h2>
          </div>

          <div className="space-y-4">
            {data.scriptureReferences.map((ref, index) => (
              <div
                key={index}
                className="avoid-break bg-white border border-gray-200 print:border-gray-400 rounded-lg p-4"
              >
                <h3 className="font-semibold text-lg text-gray-900 print:text-black mb-2">
                  {ref.reference}
                </h3>
                <p className="text-gray-700 print:text-black italic leading-relaxed">
                  "{ref.text}"
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

        {/* Footer */}
        <footer className="mt-12 print:mt-8 pt-6 border-t border-gray-300 print:border-gray-400 text-center text-sm text-gray-600 print:text-black avoid-break">
          <p>
            This is an export from MyChristianCounselor - Biblical Guidance for Life's Questions
          </p>
          <p className="mt-1">
            Generated on {formatDate(new Date())}
          </p>
          <p className="mt-2 text-xs">
            Disclaimer: This is AI-powered spiritual guidance, not professional counseling.
          </p>
        </footer>
      </main>
    </div>
  );
}
