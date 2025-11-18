'use client';

import { useState } from 'react';
import { useMemberObservations } from '../hooks/useMemberObservations';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';

interface MemberProfileModalProps {
  memberId: string;
  memberName: string;
  organizationId?: string;
  onClose: () => void;
}

export default function MemberProfileModal({
  memberId,
  memberName,
  organizationId,
  onClose,
}: MemberProfileModalProps) {
  const { observations, loading, refetch } = useMemberObservations(memberId, organizationId);
  const [isAdding, setIsAdding] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAddObservation = async () => {
    if (!newContent.trim()) return;

    setSaving(true);
    try {
      const token = localStorage.getItem('accessToken');
      const url = organizationId
        ? `${API_URL}/counsel/members/${memberId}/observations?organizationId=${organizationId}`
        : `${API_URL}/counsel/members/${memberId}/observations`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ memberId, content: newContent }),
      });

      if (!response.ok) throw new Error('Failed to create observation');

      setNewContent('');
      setIsAdding(false);
      refetch();
    } catch (error) {
      alert('Failed to create observation: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateObservation = async (id: string) => {
    if (!editContent.trim()) return;

    setSaving(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_URL}/counsel/observations/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: editContent }),
      });

      if (!response.ok) throw new Error('Failed to update observation');

      setEditingId(null);
      setEditContent('');
      refetch();
    } catch (error) {
      alert('Failed to update observation: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteObservation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this observation?')) return;

    setSaving(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_URL}/counsel/observations/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to delete observation');

      refetch();
    } catch (error) {
      alert('Failed to delete observation: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    const exportUrl = `${API_URL}/counsel/export/member/${memberId}${organizationId ? `?organizationId=${organizationId}` : ''}`;
    window.open(exportUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">
            Member Profile: {memberName}
          </h2>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"
              title="Export/Print Profile"
            >
              🖨️ Export
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(80vh-8rem)]">
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Private Observations
              </h3>
              {!isAdding && (
                <button
                  onClick={() => setIsAdding(true)}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  + Add Observation
                </button>
              )}
            </div>

            {/* Add new observation */}
            {isAdding && (
              <div className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Write your observation..."
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={4}
                  disabled={saving}
                />
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={handleAddObservation}
                    disabled={saving || !newContent.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setIsAdding(false);
                      setNewContent('');
                    }}
                    disabled={saving}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Observations list */}
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading observations...</div>
            ) : observations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No observations yet. Add your first observation above.
              </div>
            ) : (
              <div className="space-y-4">
                {observations.map((obs) => (
                  <div key={obs.id} className="p-4 border border-gray-200 rounded-lg">
                    {editingId === obs.id ? (
                      <div>
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                          rows={4}
                          disabled={saving}
                        />
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() => handleUpdateObservation(obs.id)}
                            disabled={saving || !editContent.trim()}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                          >
                            {saving ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={() => {
                              setEditingId(null);
                              setEditContent('');
                            }}
                            disabled={saving}
                            className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-gray-800 whitespace-pre-wrap mb-2">{obs.content}</p>
                        <div className="flex justify-between items-center text-sm text-gray-500">
                          <span>{new Date(obs.createdAt).toLocaleString()}</span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditingId(obs.id);
                                setEditContent(obs.content);
                              }}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteObservation(obs.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
