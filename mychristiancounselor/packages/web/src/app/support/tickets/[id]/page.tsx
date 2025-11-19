'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../contexts/AuthContext';
import { apiGet, apiPost, apiDelete } from '../../../../lib/api';
import { Tabs, Tab } from '@/components/support/Tabs';
import { SimilarityCard } from '@/components/support/SimilarityCard';

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
  aiDetectedPriority?: boolean;
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

interface SimilarityMatch {
  id: string;
  similarTicketId: string;
  similarityScore: number;
  matchType: 'active' | 'historical';
  similarTicket: {
    id: string;
    title: string;
    description: string;
    status: string;
    resolution?: string;
    createdBy: {
      firstName: string;
      lastName: string;
    };
  };
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
  const [closing, setClosing] = useState(false);

  // Resolution modal state
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolution, setResolution] = useState('');
  const [resolutionError, setResolutionError] = useState('');
  const [resolvingTicket, setResolvingTicket] = useState(false);

  // Similarity state
  const [activeMatches, setActiveMatches] = useState<SimilarityMatch[]>([]);
  const [historicalMatches, setHistoricalMatches] = useState<SimilarityMatch[]>([]);
  const [loadingSimilarity, setLoadingSimilarity] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/support/tickets/${params.id}`);
      return;
    }
    loadTicket();
    checkAdminStatus();
    fetchSimilarTickets('active');
    fetchSimilarTickets('historical');
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
    // Validate resolution
    const trimmedResolution = resolution.trim();
    if (trimmedResolution.length < 20) {
      setResolutionError('Resolution must be at least 20 characters');
      return;
    }
    if (trimmedResolution.length > 2000) {
      setResolutionError('Resolution must not exceed 2000 characters');
      return;
    }

    setResolvingTicket(true);
    setResolutionError('');

    try {
      const response = await apiPost(`/support/tickets/${ticket?.id}/resolve`, {
        resolution: trimmedResolution,
      });

      if (response.ok) {
        setShowResolveModal(false);
        setResolution('');
        await loadTicket(); // Refresh ticket data
      } else {
        const data = await response.json();
        setResolutionError(data.message || 'Failed to resolve ticket');
      }
    } catch (error) {
      console.error('Error resolving ticket:', error);
      setResolutionError('Failed to resolve ticket. Please try again.');
    } finally {
      setResolvingTicket(false);
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

  const fetchSimilarTickets = async (type: 'active' | 'historical') => {
    try {
      setLoadingSimilarity(true);
      const response = await apiGet(
        `/support/tickets/${params.id}/similar?type=${type}`
      );

      if (response.ok) {
        const data = await response.json();
        if (type === 'active') {
          setActiveMatches(data);
        } else {
          setHistoricalMatches(data);
        }
      }
    } catch (error) {
      console.error(`Error fetching ${type} similar tickets:`, error);
    } finally {
      setLoadingSimilarity(false);
    }
  };

  const handleLinkTickets = async (
    similarTicketId: string,
    relationship: string
  ) => {
    try {
      const response = await apiPost(`/support/tickets/${params.id}/link`, {
        targetTicketId: similarTicketId,
        relationship,
      });

      if (response.ok) {
        // Refresh similarity to remove linked ticket from suggestions
        fetchSimilarTickets('active');
        fetchSimilarTickets('historical');
        // Could show success toast here
      } else {
        const data = await response.json();
        alert(`Failed to link tickets: ${data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error linking tickets:', error);
      alert('Failed to link tickets');
    }
  };

  const handleDismissSuggestion = async (similarityId: string) => {
    try {
      const response = await apiDelete(`/support/similarity/${similarityId}`);

      if (response.ok) {
        // Remove from local state
        setActiveMatches((prev) => prev.filter((m) => m.id !== similarityId));
        setHistoricalMatches((prev) =>
          prev.filter((m) => m.id !== similarityId)
        );
      } else {
        const data = await response.json();
        alert(`Failed to dismiss suggestion: ${data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error dismissing suggestion:', error);
      alert('Failed to dismiss suggestion');
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
                  <div className="flex items-center gap-1">
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${getPriorityBadgeColor(ticket.priority)}`}>
                      {ticket.priority.toUpperCase()}
                    </span>
                    {ticket.aiDetectedPriority && (
                      <span
                        title="Priority detected by AI"
                        className="text-xs text-gray-500"
                      >
                        AI
                      </span>
                    )}
                  </div>
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
                    onClick={() => setShowResolveModal(true)}
                    disabled={resolvingTicket}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    Mark as Resolved
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

        {/* Similarity Tabs */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Similar Tickets</h2>
          <Tabs defaultTab="active">
            <Tab id="active" label="Similar Active Tickets" count={activeMatches.length}>
              {loadingSimilarity && activeMatches.length === 0 ? (
                <p className="text-gray-500 py-4">Loading similar tickets...</p>
              ) : activeMatches.length === 0 ? (
                <p className="text-gray-500 py-4">No similar active tickets found</p>
              ) : (
                activeMatches.map((match) => (
                  <SimilarityCard
                    key={match.id}
                    ticket={match.similarTicket}
                    score={match.similarityScore}
                    badge={match.similarityScore >= 80 ? 'red' : 'yellow'}
                    actions={
                      <>
                        <button
                          onClick={() =>
                            handleLinkTickets(match.similarTicketId, 'duplicate')
                          }
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Link as Duplicate
                        </button>
                        <button
                          onClick={() => handleDismissSuggestion(match.id)}
                          className="text-gray-600 hover:text-gray-800"
                        >
                          Dismiss
                        </button>
                      </>
                    }
                  />
                ))
              )}
            </Tab>

            <Tab id="historical" label="Historical Solutions" count={historicalMatches.length}>
              {loadingSimilarity && historicalMatches.length === 0 ? (
                <p className="text-gray-500 py-4">Loading historical solutions...</p>
              ) : historicalMatches.length === 0 ? (
                <p className="text-gray-500 py-4">
                  No similar resolved tickets found. Check back after Sunday&apos;s analysis.
                </p>
              ) : (
                historicalMatches.map((match) => (
                  <SimilarityCard
                    key={match.id}
                    ticket={match.similarTicket}
                    score={match.similarityScore}
                    resolution={match.similarTicket.resolution}
                    badge="green"
                    actions={
                      <>
                        <button
                          onClick={() =>
                            handleLinkTickets(match.similarTicketId, 'related')
                          }
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Link as Reference
                        </button>
                        <button
                          onClick={() => handleDismissSuggestion(match.id)}
                          className="text-gray-600 hover:text-gray-800"
                        >
                          Dismiss
                        </button>
                      </>
                    }
                  />
                ))
              )}
            </Tab>
          </Tabs>
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

        {/* Resolution Modal */}
        {showResolveModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-4">Resolve Ticket</h2>

                <p className="text-gray-600 mb-4">
                  Please provide a summary of how this issue was resolved. This will help
                  with future similar tickets.
                </p>

                {/* Resolution Textarea */}
                <div className="mb-4">
                  <label
                    htmlFor="resolution"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Resolution Summary <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="resolution"
                    value={resolution}
                    onChange={(e) => {
                      setResolution(e.target.value);
                      setResolutionError(''); // Clear error on change
                    }}
                    placeholder="Describe the solution or steps taken to resolve this issue..."
                    className={`w-full border rounded p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      resolutionError ? 'border-red-500' : 'border-gray-300'
                    }`}
                    rows={6}
                    minLength={20}
                    maxLength={2000}
                    disabled={resolvingTicket}
                  />

                  {/* Character Counter */}
                  <div className="flex justify-between items-center mt-2">
                    <p
                      className={`text-sm ${
                        resolution.trim().length < 20
                          ? 'text-red-600'
                          : resolution.trim().length > 2000
                          ? 'text-red-600'
                          : 'text-gray-500'
                      }`}
                    >
                      {resolution.trim().length}/2000 characters
                      {resolution.trim().length < 20 &&
                        ` (minimum 20 required)`}
                    </p>
                  </div>

                  {/* Error Message */}
                  {resolutionError && (
                    <p className="text-sm text-red-600 mt-2">{resolutionError}</p>
                  )}
                </div>

                {/* Tips */}
                <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
                  <p className="text-sm text-blue-800 font-semibold mb-1">
                    Tips for a good resolution:
                  </p>
                  <ul className="text-sm text-blue-900 list-disc list-inside space-y-1">
                    <li>Describe what was wrong and what fixed it</li>
                    <li>Include any configuration changes made</li>
                    <li>Note if this was a bug, user error, or feature limitation</li>
                    <li>Mention if this solution applies to similar issues</li>
                  </ul>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={handleResolve}
                    disabled={
                      resolvingTicket || resolution.trim().length < 20 || resolution.trim().length > 2000
                    }
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {resolvingTicket ? 'Resolving...' : 'Confirm Resolution'}
                  </button>
                  <button
                    onClick={() => {
                      setShowResolveModal(false);
                      setResolution('');
                      setResolutionError('');
                    }}
                    disabled={resolvingTicket}
                    className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
