'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminLayout } from '../../../components/AdminLayout';
import { BackButton } from '@/components/BackButton';
import { SLABadge, type SLAStatus } from '@/components/support/SLABadge';
import { SLATooltip } from '@/components/support/SLATooltip';

interface SupportTicket {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  assignedToId: string | null;

  // SLA fields
  responseSLADeadline: string | null;
  resolutionSLADeadline: string | null;
  responseSLAStatus: string;
  resolutionSLAStatus: string;
  slaPausedAt: string | null;
  slaPausedReason: string | null;

  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  assignedTo: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
}

export default function AdminSupportPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [assignmentFilter, setAssignmentFilter] = useState('all');
  const [slaFilter, setSlaFilter] = useState('all');

  // Sorting
  const [sortBy, setSortBy] = useState('created');

  // SLA tooltip state
  const [hoveredTicketSLA, setHoveredTicketSLA] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';
      const params = new URLSearchParams();

      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (priorityFilter !== 'all') params.append('priority', priorityFilter);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (assignmentFilter !== 'all') params.append('assignmentFilter', assignmentFilter);

      const response = await fetch(`${apiUrl}/support/admin/queue?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          router.push('/login?redirect=/admin/support');
          return;
        }
        throw new Error('Failed to fetch tickets');
      }

      const data = await response.json();
      setTickets(data.tickets || data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, categoryFilter, assignmentFilter, router]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const getFullName = (user: { firstName: string | null; lastName: string | null }) => {
    if (user.firstName || user.lastName) {
      return `${user.firstName || ''} ${user.lastName || ''}`.trim();
    }
    return 'N/A';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Filter tickets by SLA status
  const filteredTickets = tickets.filter((ticket) => {
    // SLA filter
    if (slaFilter !== 'all') {
      const mostUrgentStatus =
        ticket.responseSLAStatus === 'breached' ||
        (ticket.responseSLAStatus === 'critical' &&
          ticket.resolutionSLAStatus !== 'breached')
          ? ticket.responseSLAStatus
          : ticket.resolutionSLAStatus;

      if (ticket.slaPausedAt) {
        if (slaFilter !== 'paused') return false;
      } else if (mostUrgentStatus !== slaFilter) {
        return false;
      }
    }

    return true;
  });

  // Sort tickets
  const sortedTickets = [...filteredTickets].sort((a, b) => {
    if (sortBy === 'created') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }

    if (sortBy === 'updated') {
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    }

    if (sortBy === 'priority') {
      const priorityOrder: { [key: string]: number } = {
        'urgent': 1,
        'high': 2,
        'medium': 3,
        'low': 4,
      };
      return (priorityOrder[a.priority] || 5) - (priorityOrder[b.priority] || 5);
    }

    if (sortBy === 'sla_urgency') {
      const getUrgencyScore = (ticket: SupportTicket) => {
        if (ticket.slaPausedAt) return 5; // Paused is least urgent
        const status =
          ticket.responseSLAStatus === 'breached' ||
          (ticket.responseSLAStatus === 'critical' &&
            ticket.resolutionSLAStatus !== 'breached')
            ? ticket.responseSLAStatus
            : ticket.resolutionSLAStatus;

        switch (status) {
          case 'breached':
            return 1;
          case 'critical':
            return 2;
          case 'approaching':
            return 3;
          case 'on_track':
            return 4;
          default:
            return 5;
        }
      };

      return getUrgencyScore(a) - getUrgencyScore(b);
    }

    return 0;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-purple-100 text-purple-800';
      case 'waiting_on_user':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto p-6">
        <BackButton />
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Support Tickets</h1>
          <p className="text-gray-600 mt-2">Manage user support requests</p>
        </div>

        {error && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded"
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="waiting_on_user">Waiting on User</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Priority</label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded"
              >
                <option value="all">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded"
              >
                <option value="all">All Categories</option>
                <option value="technical">Technical</option>
                <option value="billing">Billing</option>
                <option value="account">Account</option>
                <option value="general">General</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Assignment</label>
              <select
                value={assignmentFilter}
                onChange={(e) => setAssignmentFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded"
              >
                <option value="all">All Tickets</option>
                <option value="assigned">Assigned</option>
                <option value="unassigned">Unassigned</option>
                <option value="mine">My Tickets</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">SLA Status</label>
              <select
                value={slaFilter}
                onChange={(e) => setSlaFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded"
              >
                <option value="all">All SLA Status</option>
                <option value="on_track">On Track</option>
                <option value="approaching">Approaching</option>
                <option value="critical">Critical</option>
                <option value="breached">Breached</option>
                <option value="paused">Paused</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded"
              >
                <option value="created">Created (Newest)</option>
                <option value="updated">Updated (Newest)</option>
                <option value="priority">Priority</option>
                <option value="sla_urgency">SLA Urgency</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tickets Table */}
        {loading ? (
          <div className="text-center py-8">Loading tickets...</div>
        ) : sortedTickets.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-lg shadow">
            <p className="text-gray-600">No tickets found</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ticket
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/support/tickets/${ticket.id}`}
                          className="text-blue-600 hover:underline font-medium"
                        >
                          {ticket.title}
                        </Link>

                        {/* SLA Badge */}
                        <div
                          className="relative"
                          onMouseEnter={() => setHoveredTicketSLA(ticket.id)}
                          onMouseLeave={() => setHoveredTicketSLA(null)}
                        >
                          <SLABadge
                            status={
                              (ticket.slaPausedAt
                                ? 'paused'
                                : ticket.responseSLAStatus === 'breached' ||
                                  (ticket.responseSLAStatus === 'critical' &&
                                    ticket.resolutionSLAStatus !== 'breached')
                                ? ticket.responseSLAStatus
                                : ticket.resolutionSLAStatus) as SLAStatus
                            }
                            type={
                              ticket.responseSLAStatus === 'breached' ||
                              (ticket.responseSLAStatus === 'critical' &&
                                ticket.resolutionSLAStatus !== 'breached')
                                ? 'response'
                                : 'resolution'
                            }
                          />

                          {/* Tooltip */}
                          {hoveredTicketSLA === ticket.id && (
                            <div className="absolute z-10 left-0 top-full mt-1">
                              <SLATooltip
                                responseSLAStatus={ticket.responseSLAStatus}
                                resolutionSLAStatus={ticket.resolutionSLAStatus}
                                responseSLADeadline={ticket.responseSLADeadline}
                                resolutionSLADeadline={ticket.resolutionSLADeadline}
                                slaPausedAt={ticket.slaPausedAt}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        #{ticket.id.substring(0, 8)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {getFullName(ticket.user)}
                      </div>
                      <div className="text-sm text-gray-500">{ticket.user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(ticket.status)}`}>
                        {ticket.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {ticket.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {ticket.assignedTo ? (
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {getFullName(ticket.assignedTo)}
                          </div>
                          <div className="text-sm text-gray-500">{ticket.assignedTo.email}</div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(ticket.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
