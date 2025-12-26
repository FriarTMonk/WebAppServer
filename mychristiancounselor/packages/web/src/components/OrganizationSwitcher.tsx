'use client';

import { useState, useEffect } from 'react';
import { Organization } from '@mychristiancounselor/shared';
import { getAccessToken } from '../lib/auth';
import { useAuth } from '../contexts/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';

/**
 * OrganizationSwitcher displays the user's organization name.
 * Shows "Individual" if the user is not a member of any organization.
 */
export function OrganizationSwitcher() {
  const { isAuthenticated } = useAuth();
  const [organizationName, setOrganizationName] = useState<string>('Individual');
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (isAuthenticated && !hasLoaded) {
      loadOrganization();
    } else if (!isAuthenticated) {
      // Reset when user logs out
      setOrganizationName('Individual');
      setHasLoaded(false);
    }
  }, [isAuthenticated, hasLoaded]);

  const loadOrganization = async () => {
    const token = getAccessToken();
    if (!token) {
      setOrganizationName('Individual');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/organizations`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        console.error('Failed to load organizations:', response.statusText);
        setOrganizationName('Individual');
        setHasLoaded(true);
        return;
      }

      const data: Organization[] = await response.json();
      if (data.length > 0) {
        setOrganizationName(data[0].name);
      } else {
        setOrganizationName('Individual');
      }
      setHasLoaded(true);
    } catch (error) {
      console.error('Failed to load organizations:', error);
      setOrganizationName('Individual');
      setHasLoaded(true);
    }
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md">
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
      </svg>
      <span>{organizationName}</span>
    </div>
  );
}
