'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';

interface Message {
  id: string;
  role: string;
  content: string;
  timestamp: string;
  scriptureReferences: any[];
}

interface SharedSession {
  id: string;
  title: string;
  createdAt: string;
  messages: Message[];
  isReadOnly: boolean;
}

export default function SharedConversationPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [session, setSession] = useState<SharedSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSharedSession = async () => {
      try {
        const response = await fetch(`${API_URL}/counsel/shared/${token}`);

        if (response.ok) {
          const data = await response.json();
          setSession(data);
        } else {
          setError('This share link is invalid or has expired.');
        }
      } catch (err) {
        console.error('Error fetching shared session:', err);
        setError('An error occurred while loading the conversation.');
      } finally {
        setLoading(false);
      }
    };

    fetchSharedSession();
  }, [token]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading shared conversation...</div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            📖 Read-Only View - This conversation has been shared with you
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{session.title}</h1>
          <p className="text-sm text-gray-600 mb-6">
            Started: {formatDate(session.createdAt)}
          </p>

          <div className="space-y-4">
            {session.messages.map((message) => (
              <div
                key={message.id}
                className={`p-4 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-50 border border-blue-200'
                    : 'bg-gray-50 border border-gray-200'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-semibold text-gray-900 capitalize">
                    {message.role === 'assistant' ? 'Counselor' : message.role}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatDate(message.timestamp)}
                  </span>
                </div>
                <p className="text-gray-700 whitespace-pre-wrap">{message.content}</p>

                {message.scriptureReferences && message.scriptureReferences.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-300">
                    <p className="text-sm font-semibold text-gray-700 mb-2">
                      Scripture References:
                    </p>
                    {message.scriptureReferences.map((ref: any, index: number) => (
                      <div key={index} className="text-sm text-gray-600 mb-2">
                        <span className="font-semibold">{ref.reference}</span>
                        <p className="italic mt-1">{ref.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="text-center p-6 bg-white rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Want your own Christian counseling?
          </h3>
          <p className="text-gray-600 mb-4">
            Create a free account to start your own conversations
          </p>
          <button
            onClick={() => router.push('/register')}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Create Free Account
          </button>
        </div>
      </div>
    </div>
  );
}
