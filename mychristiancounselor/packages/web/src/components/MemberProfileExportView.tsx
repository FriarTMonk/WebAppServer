'use client';

import React, { useState, useEffect } from 'react';
import { getAccessToken } from '../lib/auth';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';

interface MemberInfo {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  createdAt: string | Date;
}

interface CounselorInfo {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
}

interface OrganizationInfo {
  id: string;
  name: string;
  description: string | null;
}

interface Observation {
  id: string;
  content: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface AssignmentHistoryItem {
  counselorName: string;
  status: string;
  assignedAt: string | Date;
  endedAt: string | Date | null;
}

interface MemberProfileExportData {
  member: MemberInfo;
  counselor: CounselorInfo;
  organization: OrganizationInfo;
  assignment: {
    assignedAt: string | Date;
    status: string;
  };
  observations: Observation[];
  assignmentHistory: AssignmentHistoryItem[];
}

interface MemberProfileExportViewProps {
  memberId: string;
  organizationId: string;
}

export function MemberProfileExportView({ memberId, organizationId }: MemberProfileExportViewProps) {
  const [data, setData] = useState<MemberProfileExportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showObservationsGrey, setShowObservationsGrey] = useState(false);

  useEffect(() => {
    const fetchExportData = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = getAccessToken();
        if (!token) {
          setError('You must be logged in to view member profile exports');
          setLoading(false);
          return;
        }

        const response = await axios.get(
          `${API_URL}/counsel/export/member/${memberId}?organizationId=${organizationId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 30000,
          }
        );

        setData(response.data);
      } catch (err: any) {
        console.error('Error fetching export data:', err);

        if (err.response?.status === 404) {
          setError('Member profile not found');
        } else if (err.response?.status === 403) {
          setError('Access denied: You do not have permission to view this member profile');
        } else {
          setError(err.response?.data?.message || 'Failed to load member profile data');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchExportData();
  }, [memberId, organizationId]);

  const formatDate = (date: string | Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (date: string | Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getMemberDisplayName = (): string => {
    if (!data?.member) return 'Unknown Member';
    const { firstName, lastName, email } = data.member;
    if (firstName && lastName) return `${firstName} ${lastName}`;
    if (firstName) return firstName;
    if (lastName) return lastName;
    return email;
  };

  const getCounselorDisplayName = (): string => {
    if (!data?.counselor) return 'Unknown Counselor';
    const { firstName, lastName, email } = data.counselor;
    if (firstName && lastName) return `${firstName} ${lastName}`;
    if (firstName) return firstName;
    if (lastName) return lastName;
    return email;
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="text-center py-12" role="status" aria-live="polite">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading member profile data...</p>
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
          aria-label="Print member profile"
        >
          🖨️ Print
        </button>

        {data.observations.length > 0 && (
          <label className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-lg text-sm cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={showObservationsGrey}
              onChange={(e) => setShowObservationsGrey(e.target.checked)}
              className="w-4 h-4 cursor-pointer"
            />
            <span className="text-gray-700">Print Observations in Grey</span>
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
              Member Profile Export - Counseling Record
            </p>
          </div>

          {/* Member Information */}
          <div className="mt-6 print:mt-4 bg-gray-50 print:bg-white border border-gray-200 print:border-gray-400 rounded-lg p-4 avoid-break">
            <h2 className="text-lg font-semibold text-gray-900 print:text-black mb-3">
              Member Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="font-medium text-gray-700 print:text-black">Name:</span>
                <span className="ml-2 text-gray-900 print:text-black">{getMemberDisplayName()}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700 print:text-black">Email:</span>
                <span className="ml-2 text-gray-900 print:text-black">{data.member.email}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700 print:text-black">Organization:</span>
                <span className="ml-2 text-gray-900 print:text-black">{data.organization.name}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700 print:text-black">Member Since:</span>
                <span className="ml-2 text-gray-900 print:text-black">
                  {formatDate(data.member.createdAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Current Counselor */}
          <div className="mt-4 bg-blue-50 print:bg-white border border-blue-200 print:border-gray-400 rounded-lg p-4 avoid-break">
            <h2 className="text-lg font-semibold text-gray-900 print:text-black mb-3">
              Current Counselor Assignment
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="font-medium text-gray-700 print:text-black">Counselor:</span>
                <span className="ml-2 text-gray-900 print:text-black">{getCounselorDisplayName()}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700 print:text-black">Assigned Date:</span>
                <span className="ml-2 text-gray-900 print:text-black">
                  {formatDate(data.assignment.assignedAt)}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700 print:text-black">Status:</span>
                <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                  data.assignment.status === 'active'
                    ? 'bg-green-100 text-green-800 print:bg-white print:text-black'
                    : 'bg-gray-100 text-gray-600 print:bg-white print:text-black'
                }`}>
                  {data.assignment.status.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Counselor Observations */}
        <section className="mb-8 print:mb-6">
          <div className="border-b-2 border-gray-300 mb-4 pb-2">
            <h2 className="text-2xl font-bold text-gray-900 print:text-black">Counselor Observations</h2>
          </div>

          {data.observations.length === 0 ? (
            <p className="text-gray-500 print:text-black text-center py-4">
              No observations recorded yet.
            </p>
          ) : (
            <div className="space-y-4">
              {data.observations.map((observation) => (
                <div
                  key={observation.id}
                  className="avoid-break border rounded-lg p-4 bg-white border-gray-200 print:border-gray-400"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-xs text-gray-600 ${showObservationsGrey ? 'print:text-gray-400' : 'print:text-black'}`}>
                      {formatDateTime(observation.createdAt)}
                    </span>
                    {observation.updatedAt !== observation.createdAt && (
                      <span className={`text-xs text-gray-500 italic ${showObservationsGrey ? 'print:text-gray-400' : 'print:text-black'}`}>
                        Updated: {formatDateTime(observation.updatedAt)}
                      </span>
                    )}
                  </div>
                  <div className={`text-gray-800 whitespace-pre-wrap leading-relaxed ${showObservationsGrey ? 'print:text-gray-500' : 'print:text-black'}`}>
                    {observation.content}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Assignment History */}
        {data.assignmentHistory.length > 1 && (
          <section className="mb-8 print:mb-6 page-break-before">
            <div className="border-b-2 border-gray-300 mb-4 pb-2">
              <h2 className="text-2xl font-bold text-gray-900 print:text-black">
                Counselor Assignment History
              </h2>
            </div>

            <div className="space-y-3">
              {data.assignmentHistory.map((assignment, index) => (
                <div
                  key={index}
                  className="avoid-break border rounded-lg p-4 bg-white border-gray-200 print:border-gray-400"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-semibold text-gray-900 print:text-black">
                        {assignment.counselorName}
                      </span>
                      <div className="text-sm text-gray-600 print:text-black mt-1">
                        <span>Assigned: {formatDate(assignment.assignedAt)}</span>
                        {assignment.endedAt && (
                          <span className="ml-4">Ended: {formatDate(assignment.endedAt)}</span>
                        )}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        assignment.status === 'active'
                          ? 'bg-green-100 text-green-800 print:bg-white print:text-black'
                          : 'bg-gray-100 text-gray-600 print:bg-white print:text-black'
                      }`}
                    >
                      {assignment.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="mt-12 print:mt-8 pt-6 border-t border-gray-300 print:border-gray-400 text-center text-sm text-gray-600 print:text-black avoid-break">
          <p>
            This is an export from MyChristianCounselor - Member Counseling Record
          </p>
          <p className="mt-1">Generated on {formatDateTime(new Date())}</p>
          <p className="mt-2 text-xs">
            Confidential: This document contains private counseling information
          </p>
        </footer>
      </main>
    </div>
  );
}
