'use client';

import { useState, useEffect } from 'react';
import { Organization } from '@mychristiancounselor/shared';
import { getAccessToken } from '../lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';

export function OrganizationSwitcher() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    const token = getAccessToken();
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/organizations`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        console.error('Failed to load organizations:', response.statusText);
        return;
      }

      const data = await response.json();
      setOrganizations(data);
      if (data.length > 0) {
        setCurrentOrg(data[0]);
      }
    } catch (error) {
      console.error('Failed to load organizations:', error);
    }
  };

  if (organizations.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
      >
        {currentOrg?.name || 'Select Organization'}
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-64 bg-white rounded-md shadow-lg py-1 z-10">
          {organizations.map(org => (
            <button
              key={org.id}
              onClick={() => {
                setCurrentOrg(org);
                setIsOpen(false);
              }}
              className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                currentOrg?.id === org.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
              }`}
            >
              <div className="font-medium">{org.name}</div>
              <div className="text-xs text-gray-500">
                {org.licenseStatus} • {org.maxMembers} members
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
