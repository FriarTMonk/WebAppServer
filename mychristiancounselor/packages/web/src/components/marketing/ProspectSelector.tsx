'use client';

import React, { useState, useEffect } from 'react';
import { apiPost } from '@/lib/api';

interface ProspectContact {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  title: string | null;
  isPrimary: boolean;
}

interface Prospect {
  id: string;
  organizationName: string;
  lastCampaignSentAt: string | null;
  convertedAt: string | null;
  archivedAt: string | null;
  contacts: ProspectContact[];
}

interface EligibilityResult {
  eligible: string[];
  ineligible: Array<{ prospectContactId: string; reason: string; lastCampaignSentAt?: string }>;
  eligibleCount: number;
  ineligibleCount: number;
}

interface ProspectSelectorProps {
  selectedContactIds: string[];
  onChange: (contactIds: string[]) => void;
}

export function ProspectSelector({ selectedContactIds, onChange }: ProspectSelectorProps) {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [eligibility, setEligibility] = useState<EligibilityResult | null>(null);
  const [checkingEligibility, setCheckingEligibility] = useState(false);

  useEffect(() => {
    fetchProspects();
  }, []);

  const fetchProspects = async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';
      const response = await fetch(`${apiUrl}/marketing/prospects?includeArchived=false&includeConverted=false`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch prospects');
      }

      const data = await response.json();
      setProspects(data);
    } catch (err) {
      console.error('Failed to fetch prospects:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkEligibility = async () => {
    if (selectedContactIds.length === 0) {
      return;
    }

    setCheckingEligibility(true);
    try {
      const response = await apiPost('/marketing/campaigns/check-prospects', {
        prospectContactIds: selectedContactIds,
      });

      if (!response.ok) {
        throw new Error('Failed to check eligibility');
      }

      const data = await response.json();
      setEligibility(data);
    } catch (err) {
      console.error('Failed to check eligibility:', err);
    } finally {
      setCheckingEligibility(false);
    }
  };

  const toggleContact = (contactId: string) => {
    if (selectedContactIds.includes(contactId)) {
      onChange(selectedContactIds.filter(id => id !== contactId));
    } else {
      onChange([...selectedContactIds, contactId]);
    }
  };

  const toggleAllContactsForProspect = (prospect: Prospect) => {
    const prospectContactIds = prospect.contacts.map(c => c.id);
    const allSelected = prospectContactIds.every(id => selectedContactIds.includes(id));

    if (allSelected) {
      onChange(selectedContactIds.filter(id => !prospectContactIds.includes(id)));
    } else {
      const newIds = [...selectedContactIds];
      prospectContactIds.forEach(id => {
        if (!newIds.includes(id)) {
          newIds.push(id);
        }
      });
      onChange(newIds);
    }
  };

  const canReceiveCampaign = (lastSent: string | null) => {
    if (!lastSent) return true;
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    return new Date(lastSent) < ninetyDaysAgo;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  const getIneligibilityReason = (contactId: string) => {
    if (!eligibility) return null;
    return eligibility.ineligible.find(item => item.prospectContactId === contactId);
  };

  const filteredProspects = prospects.filter(prospect => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      prospect.organizationName.toLowerCase().includes(searchLower) ||
      prospect.contacts.some(c =>
        c.name.toLowerCase().includes(searchLower) ||
        c.email.toLowerCase().includes(searchLower)
      )
    );
  });

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Loading prospects...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Actions */}
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Search prospects or contacts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          type="button"
          onClick={checkEligibility}
          disabled={selectedContactIds.length === 0 || checkingEligibility}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {checkingEligibility ? 'Checking...' : 'Check Eligibility'}
        </button>
      </div>

      {/* Selection Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="font-medium text-blue-900">
              {selectedContactIds.length} contact{selectedContactIds.length !== 1 ? 's' : ''} selected
            </span>
            {eligibility && (
              <span className="ml-4 text-sm text-blue-700">
                • {eligibility.eligibleCount} eligible, {eligibility.ineligibleCount} ineligible
              </span>
            )}
          </div>
          {selectedContactIds.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Prospects Table */}
      <div className="border border-gray-300 rounded-lg overflow-hidden">
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="w-12 px-4 py-3"></th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Organization
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Contact
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Last Campaign
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProspects.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No prospects found
                  </td>
                </tr>
              ) : (
                filteredProspects.map((prospect) => {
                  const allContactsSelected = prospect.contacts.every(c => selectedContactIds.includes(c.id));
                  const someContactsSelected = prospect.contacts.some(c => selectedContactIds.includes(c.id));
                  const eligible = canReceiveCampaign(prospect.lastCampaignSentAt);

                  return (
                    <React.Fragment key={prospect.id}>
                      {/* Organization Header Row */}
                      <tr className="bg-gray-50">
                        <td className="px-4 py-2">
                          <input
                            type="checkbox"
                            checked={allContactsSelected}
                            ref={input => {
                              if (input) {
                                input.indeterminate = someContactsSelected && !allContactsSelected;
                              }
                            }}
                            onChange={() => toggleAllContactsForProspect(prospect)}
                            className="rounded"
                          />
                        </td>
                        <td colSpan={4} className="px-4 py-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-semibold text-gray-900">{prospect.organizationName}</span>
                              <span className="ml-2 text-sm text-gray-500">
                                ({prospect.contacts.length} contact{prospect.contacts.length !== 1 ? 's' : ''})
                              </span>
                            </div>
                            {!eligible && (
                              <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                                90-day cooldown
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Contact Rows */}
                      {prospect.contacts.map((contact) => {
                        const isSelected = selectedContactIds.includes(contact.id);
                        const ineligible = getIneligibilityReason(contact.id);

                        return (
                          <tr key={contact.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleContact(contact.id)}
                                className="rounded"
                              />
                            </td>
                            <td className="px-4 py-2"></td>
                            <td className="px-4 py-2">
                              <div className="text-sm">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-900">{contact.name}</span>
                                  {contact.isPrimary && (
                                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                                      Primary
                                    </span>
                                  )}
                                </div>
                                <div className="text-gray-500">{contact.email}</div>
                                {contact.title && (
                                  <div className="text-xs text-gray-400">{contact.title}</div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {formatDate(prospect.lastCampaignSentAt)}
                            </td>
                            <td className="px-4 py-2">
                              {ineligible ? (
                                <div className="text-xs">
                                  <span className="px-2 py-1 bg-red-100 text-red-800 rounded">
                                    Ineligible
                                  </span>
                                  <div className="text-red-600 mt-1">{ineligible.reason}</div>
                                </div>
                              ) : eligible ? (
                                <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                                  Eligible
                                </span>
                              ) : (
                                <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                                  Cooldown
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
