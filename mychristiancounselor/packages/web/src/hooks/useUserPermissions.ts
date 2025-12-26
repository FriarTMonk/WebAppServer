'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiGet } from '../lib/api';

export interface UserPermissions {
  canAddBooks: boolean;
  canViewPendingEvals: boolean;
  canTriggerReeval: boolean;
  canViewNotAligned: boolean;
  isOrgAdmin: boolean;
  isCounselor: boolean;
  isPlatformAdmin: boolean;
}

interface OrganizationResponse {
  role?: {
    name?: string;
  };
}

interface AdminHealthCheckResponse {
  isPlatformAdmin?: boolean;
}

// Constants
const DEFAULT_PERMISSIONS: UserPermissions = {
  canAddBooks: false,
  canViewPendingEvals: false,
  canTriggerReeval: false,
  canViewNotAligned: false,
  isOrgAdmin: false,
  isCounselor: false,
  isPlatformAdmin: false,
};

const COUNSELOR_ROLE_NAME = 'Counselor';

export function useUserPermissions(): UserPermissions {
  const { user, isAuthenticated } = useAuth();
  const [permissions, setPermissions] = useState<UserPermissions>(DEFAULT_PERMISSIONS);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setPermissions(DEFAULT_PERMISSIONS);
      return;
    }

    const abortController = new AbortController();

    // Use Promise.allSettled to collect all results first, then update state once
    Promise.allSettled([
      apiGet('/admin/health-check').then(res => res.ok ? res.json() : null),
      apiGet('/org-admin/organization').then(res => res.ok ? res.json() : null),
      apiGet('/profile/organizations').then(res => res.ok ? res.json() : null),
    ]).then(([adminResult, orgAdminResult, orgsResult]) => {
      // Check if component is still mounted
      if (abortController.signal.aborted) {
        return;
      }

      // Start with default permissions
      const newPermissions: UserPermissions = { ...DEFAULT_PERMISSIONS };

      // Process platform admin result
      if (adminResult.status === 'fulfilled' && adminResult.value) {
        const adminData = adminResult.value as AdminHealthCheckResponse;
        const isPlatformAdmin = adminData.isPlatformAdmin === true;
        newPermissions.isPlatformAdmin = isPlatformAdmin;
        newPermissions.canTriggerReeval = isPlatformAdmin;
        newPermissions.canViewNotAligned = isPlatformAdmin;
      } else if (adminResult.status === 'rejected') {
        console.debug('Not a platform admin:', adminResult.reason);
      }

      // Process org admin result
      if (orgAdminResult.status === 'fulfilled' && orgAdminResult.value) {
        newPermissions.isOrgAdmin = true;
        newPermissions.canAddBooks = true;
        newPermissions.canViewPendingEvals = true;
      } else if (orgAdminResult.status === 'rejected') {
        console.debug('Not an org admin:', orgAdminResult.reason);
      }

      // Process counselor role result
      if (orgsResult.status === 'fulfilled' && orgsResult.value) {
        const orgs = orgsResult.value as OrganizationResponse[];
        const hasCounselorRole = Array.isArray(orgs) &&
          orgs.some((org) => org.role?.name?.includes(COUNSELOR_ROLE_NAME));

        if (hasCounselorRole) {
          newPermissions.isCounselor = true;
          newPermissions.canAddBooks = true;
        }
      } else if (orgsResult.status === 'rejected') {
        console.debug('No counselor role:', orgsResult.reason);
      }

      // Update state once with all permissions
      setPermissions(newPermissions);
    }).catch((error) => {
      console.error('Error checking user permissions:', error);
    });

    // Cleanup function to prevent setState on unmounted component
    return () => {
      abortController.abort();
    };
  }, [isAuthenticated, user]);

  return permissions;
}
