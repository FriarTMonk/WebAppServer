'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '../../../components/AdminLayout';
import { StageBadge, type SalesStage } from '../../../components/sales/StageBadge';
import { LeadSourceIcon, type LeadSource } from '../../../components/sales/LeadSourceIcon';
import { ProbabilityBar } from '../../../components/sales/ProbabilityBar';

interface SalesOpportunity {
  id: string;
  title: string;
  description: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  companyName?: string;
  stage: SalesStage;
  leadSource: LeadSource;
  dealValue: number;
  probability: number;
  priorityScore: number;
  estimatedCloseDate?: string;
  lastActivityAt?: string;
  assignedTo?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
  createdAt: string;
}

export default function SalesQueuePage() {
  const router = useRouter();
  const [opportunities, setOpportunities] = useState<SalesOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [assignmentFilter, setAssignmentFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('priorityScore');

  const fetchOpportunities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';
      const params = new URLSearchParams();

      if (stageFilter !== 'all') params.append('stage', stageFilter);
      if (sourceFilter !== 'all') params.append('leadSource', sourceFilter);
      if (assignmentFilter !== 'all') params.append('assignmentFilter', assignmentFilter);
      params.append('sortBy', sortBy);

      const response = await fetch(`${apiUrl}/sales/admin/queue?${params.toString()}`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          router.push('/login?redirect=/admin/sales');
          return;
        }
        throw new Error('Failed to fetch opportunities');
      }

      const data = await response.json();
      setOpportunities(data.opportunities || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [stageFilter, sourceFilter, assignmentFilter, sortBy, router]);

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatRelativeTime = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    return formatDate(dateString);
  };

  return (
    <AdminLayout>
      <div>
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-gray-900">Sales Queue</h2>
          <button
            onClick={fetchOpportunities}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Stage Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Stages</option>
                <option value="prospect">Prospect</option>
                <option value="qualified">Qualified</option>
                <option value="proposal">Proposal</option>
                <option value="negotiation">Negotiation</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
              </select>
            </div>

            {/* Lead Source Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lead Source</label>
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Sources</option>
                <option value="email">Email</option>
                <option value="website">Website</option>
                <option value="referral">Referral</option>
                <option value="cold_outreach">Cold Outreach</option>
                <option value="event">Event</option>
                <option value="partner">Partner</option>
              </select>
            </div>

            {/* Assignment Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assignment</label>
              <select
                value={assignmentFilter}
                onChange={(e) => setAssignmentFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All</option>
                <option value="unassigned">Unassigned</option>
                <option value="assigned">Assigned</option>
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="priorityScore">Priority Score</option>
                <option value="dealValue">Deal Value</option>
                <option value="probability">Probability</option>
                <option value="createdAt">Created Date</option>
                <option value="estimatedCloseDate">Close Date</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading opportunities...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">Error: {error}</p>
            <button
              onClick={fetchOpportunities}
              className="mt-2 text-sm text-red-600 hover:underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Opportunities Table */}
        {!loading && !error && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {opportunities.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No opportunities found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Opportunity
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Stage
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Deal Value
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Probability
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Source
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Assigned To
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Activity
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Priority
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {opportunities.map((opp) => (
                      <tr key={opp.id} className="hover:bg-gray-50 cursor-pointer">
                        <td className="px-4 py-4">
                          <div className="text-sm font-medium text-gray-900">{opp.title}</div>
                          {opp.companyName && (
                            <div className="text-sm text-gray-500">{opp.companyName}</div>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm text-gray-900">{opp.contactName}</div>
                          <div className="text-sm text-gray-500">{opp.contactEmail}</div>
                        </td>
                        <td className="px-4 py-4">
                          <StageBadge stage={opp.stage} />
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(opp.dealValue)}
                          </div>
                          {opp.estimatedCloseDate && (
                            <div className="text-xs text-gray-500">
                              Close: {formatDate(opp.estimatedCloseDate)}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <ProbabilityBar probability={opp.probability} />
                        </td>
                        <td className="px-4 py-4">
                          <LeadSourceIcon source={opp.leadSource} />
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm text-gray-900">
                            {opp.assignedTo
                              ? `${opp.assignedTo.firstName || ''} ${opp.assignedTo.lastName || ''}`.trim() || opp.assignedTo.email
                              : 'Unassigned'}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm text-gray-500">
                            {formatRelativeTime(opp.lastActivityAt)}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            {opp.priorityScore.toFixed(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
