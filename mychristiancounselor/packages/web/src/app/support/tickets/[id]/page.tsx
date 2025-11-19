'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../contexts/AuthContext';
import { apiGet, apiPost } from '../../../../lib/api';

interface Message {
  id: string;
  content: string;
  authorRole: string;
  isInternal: boolean;
  createdAt: string;
  author: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
}

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  closedAt?: string;
  createdBy: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  assignedTo?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  organization?: {
    id: string;
    name: string;
  };
  messages: Message[];
}

export default function TicketDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  // Reply form state
  const [replyContent, setReplyContent] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Admin action states
  const [assigning, setAssigning] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/support/tickets/${params.id}`);
      return;
    }
    loadTicket();
    checkAdminStatus();
  }, [isAuthenticated, params.id]);

  const checkAdminStatus = async () => {
    try {
      const response = await apiGet('/admin/health-check');
      if (response.ok) {
        const data = await response.json();
        setIsAdmin(data.isPlatformAdmin === true);
      }
    } catch (err) {
      setIsAdmin(false);
    }
  };

  const loadTicket = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await apiGet(`/support/tickets/${params.id}`);

      if (response.ok) {
        const data = await response.json();
        setTicket(data);
      } else if (response.status === 404) {
        setError('Ticket not found');
      } else if (response.status === 403) {
        setError('You do not have permission to view this ticket');
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.message || 'Failed to load ticket');
      }
    } catch (err: unknown) {
      console.error('Error fetching ticket:', err);
      const message = err instanceof Error ? err.message : 'Failed to load ticket. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim() || !ticket) return;

    setSubmitting(true);
    try {
      const response = await apiPost(`/support/tickets/${ticket.id}/messages`, {
        content: replyContent,
        isInternal: isAdmin ? isInternal : false, // Only admins can post internal messages
      });

      if (response.ok) {
        setReplyContent('');
        setIsInternal(false);
        await loadTicket(); // Reload to show new message
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.message || 'Failed to send reply');
      }
    } catch (err: unknown) {
      console.error('Error sending reply:', err);
      const message = err instanceof Error ? err.message : 'Failed to send reply';
      alert(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssign = async () => {
    if (!ticket || !user) return;

    setAssigning(true);
    try {
      const response = await apiPost(`/support/admin/tickets/${ticket.id}/assign`);

      if (response.ok) {
        await loadTicket(); // Reload to show assignment
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.message || 'Failed to assign ticket');
      }
    } catch (err: unknown) {
      console.error('Error assigning ticket:', err);
      const message = err instanceof Error ? err.message : 'Failed to assign ticket';
      alert(message);
    } finally {
      setAssigning(false);
    }
  };

  const handleResolve = async () => {
    if (!ticket) return;

    if (!confirm('Mark this ticket as resolved?')) return;

    setResolving(true);
    try {
      const response = await apiPost(`/support/admin/tickets/${ticket.id}/resolve`);

      if (response.ok) {
        await loadTicket(); // Reload to show resolved status
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.message || 'Failed to resolve ticket');
      }
    } catch (err: unknown) {
      console.error('Error resolving ticket:', err);
      const message = err instanceof Error ? err.message : 'Failed to resolve ticket';
      alert(message);
    } finally {
      setResolving(false);
    }
  };

  const handleClose = async () => {
    if (!ticket) return;

    if (!confirm('Close this ticket? This action cannot be undone.')) return;

    setClosing(true);
    try {
      const response = await apiPost(`/support/admin/tickets/${ticket.id}/close`);

      if (response.ok) {
        await loadTicket(); // Reload to show closed status
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.message || 'Failed to close ticket');
      }
    } catch (err: unknown) {
      console.error('Error closing ticket:', err);
      const message = err instanceof Error ? err.message : 'Failed to close ticket';
      alert(message);
    } finally {
      setClosing(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    const colors: Record<string, string> = {
      open: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      waiting_on_user: 'bg-orange-100 text-orange-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityBadgeColor = (priority: string) => {
    const colors: Record<string, string> = {
      urgent: 'bg-red-100 text-red-800 font-bold',
      high: 'bg-orange-100 text-orange-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800',
      feature: 'bg-blue-100 text-blue-800',
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatCategory = (category: string) => {
    return category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getAuthorName = (author: { firstName?: string; lastName?: string; email: string }) => {
    if (author.firstName || author.lastName) {
      return `${author.firstName || ''} ${author.lastName || ''}`.trim();
    }
    return author.email;
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Redirecting to login...</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading ticket...</div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="mb-6">
            <button
              onClick={() => router.push('/support/tickets')}
              className="text-blue-600 hover:text-blue-700 flex items-center gap-2"
            >
              ← Back to Tickets
            </button>
          </div>
          <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error || 'Ticket not found'}
          </div>
        </div>
      </div>
    );
  }

  const canReply = ticket.status !== 'closed' && ticket.status !== 'rejected';
  const isTicketCreator = user?.id === ticket.createdBy.id;
  const isAssignedAdmin = user?.id === ticket.assignedTo?.id;
  const canPerformAdminActions = isAdmin && (isAssignedAdmin || !ticket.assignedTo);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Back button */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/support/tickets')}
            className="text-blue-600 hover:text-blue-700 flex items-center gap-2"
          >
            ← Back to Tickets
          </button>
        </div>

        {/* Ticket Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="mb-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  #{ticket.id.substring(0, 8)} - {ticket.title}
                </h1>
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusBadgeColor(ticket.status)}`}>
                    {formatStatus(ticket.status)}
                  </span>
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${getPriorityBadgeColor(ticket.priority)}`}>
                    {ticket.priority.toUpperCase()}
                  </span>
                  <span className="px-3 py-1 text-sm font-medium rounded-full bg-gray-100 text-gray-800">
                    {formatCategory(ticket.category)}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">Created by:</span> {getAuthorName(ticket.createdBy)}
              </div>
              {ticket.assignedTo && (
                <div>
                  <span className="font-medium">Assigned to:</span> {getAuthorName(ticket.assignedTo)}
                </div>
              )}
              {ticket.organization && (
                <div>
                  <span className="font-medium">Organization:</span> {ticket.organization.name}
                </div>
              )}
              <div>
                <span className="font-medium">Created:</span> {formatDateTime(ticket.createdAt)}
              </div>
              {ticket.resolvedAt && (
                <div>
                  <span className="font-medium">Resolved:</span> {formatDateTime(ticket.resolvedAt)}
                </div>
              )}
              {ticket.closedAt && (
                <div>
                  <span className="font-medium">Closed:</span> {formatDateTime(ticket.closedAt)}
                </div>
              )}
            </div>
          </div>

          {/* Admin Actions */}
          {isAdmin && canPerformAdminActions && (
            <div className="pt-4 border-t border-gray-200">
              <div className="flex flex-wrap gap-3">
                {!ticket.assignedTo && (
                  <button
                    onClick={handleAssign}
                    disabled={assigning}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {assigning ? 'Assigning...' : 'Assign to Me'}
                  </button>
                )}
                {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
                  <button
                    onClick={handleResolve}
                    disabled={resolving}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {resolving ? 'Resolving...' : 'Mark as Resolved'}
                  </button>
                )}
                {ticket.status !== 'closed' && (
                  <button
                    onClick={handleClose}
                    disabled={closing}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
                  >
                    {closing ? 'Closing...' : 'Close Ticket'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Original Description */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Original Issue</h2>
          <div className="prose max-w-none">
            <p className="whitespace-pre-wrap text-gray-700">{ticket.description}</p>
          </div>
        </div>

        {/* Messages/Conversation */}
        {ticket.messages.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Conversation</h2>
            <div className="space-y-6">
              {ticket.messages.map((message) => {
                const isAdminMessage = message.authorRole === 'platform_admin' || message.authorRole === 'org_admin';
                const isMyMessage = user?.id === message.author.id;

                return (
                  <div
                    key={message.id}
                    className={`border-l-4 pl-4 py-3 ${
                      message.isInternal
                        ? 'border-purple-500 bg-purple-50'
                        : isAdminMessage
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {getAuthorName(message.author)}
                        </span>
                        {message.isInternal && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded bg-purple-200 text-purple-800">
                            INTERNAL
                          </span>
                        )}
                        {isAdminMessage && !message.isInternal && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded bg-blue-200 text-blue-800">
                            SUPPORT
                          </span>
                        )}
                        {isMyMessage && (
                          <span className="text-xs text-gray-500">(You)</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatDateTime(message.createdAt)}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-gray-700">{message.content}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Reply Form */}
        {canReply && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Reply</h2>
            <form onSubmit={handleReply}>
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={6}
                placeholder="Type your reply here..."
                minLength={10}
                required
              />
              <div className="text-sm text-gray-500 mb-4">
                {replyContent.length}/5000 characters
              </div>

              {/* Internal checkbox for admins */}
              {isAdmin && (
                <div className="mb-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-700">
                      Internal note (only visible to admins)
                    </span>
                  </label>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting || !replyContent.trim() || replyContent.length > 5000}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Sending...' : 'Send Reply'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Resolved/Closed Notice */}
        {ticket.status === 'resolved' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-6">
            <p className="text-green-800">
              This ticket has been marked as resolved. If you need further assistance, you can reply to reopen it.
            </p>
          </div>
        )}

        {ticket.status === 'closed' && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-6">
            <p className="text-gray-800">
              This ticket has been closed and is no longer accepting replies.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
