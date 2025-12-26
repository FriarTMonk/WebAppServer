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

export function useUserPermissions(): UserPermissions {
  const { user, isAuthenticated } = useAuth();
  const [permissions, setPermissions] = useState<UserPermissions>({
    canAddBooks: false,
    canViewPendingEvals: false,
    canTriggerReeval: false,
    canViewNotAligned: false,
    isOrgAdmin: false,
    isCounselor: false,
    isPlatformAdmin: false,
  });

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setPermissions({
        canAddBooks: false,
        canViewPendingEvals: false,
        canTriggerReeval: false,
        canViewNotAligned: false,
        isOrgAdmin: false,
        isCounselor: false,
        isPlatformAdmin: false,
      });
      return;
    }

    // Check if user is Platform Admin
    apiGet('/admin/health-check')
      .then(res => {
        if (res.ok) {
          return res.json();
        }
        throw new Error('Not a platform admin');
      })
      .then(data => {
        const isPlatformAdmin = data.isPlatformAdmin === true;
        setPermissions(prev => ({
          ...prev,
          isPlatformAdmin,
          canTriggerReeval: isPlatformAdmin,
          canViewNotAligned: isPlatformAdmin,
        }));
      })
      .catch(() => {
        // Not a platform admin, continue with other checks
      });

    // Check if user is Organization Admin
    apiGet('/org-admin/organization')
      .then(res => {
        if (res.ok) {
          setPermissions(prev => ({
            ...prev,
            isOrgAdmin: true,
            canAddBooks: true,
            canViewPendingEvals: true,
          }));
        }
      })
      .catch(() => {
        // Not an org admin
      });

    // Check if user has Counselor role
    apiGet('/profile/organizations')
      .then(res => {
        if (res.ok) {
          return res.json();
        }
        throw new Error('No organizations');
      })
      .then(orgs => {
        const hasCounselorRole = Array.isArray(orgs) &&
          orgs.some((org: any) => org.role?.name?.includes('Counselor'));

        if (hasCounselorRole) {
          setPermissions(prev => ({
            ...prev,
            isCounselor: true,
            canAddBooks: true,
          }));
        }
      })
      .catch(() => {
        // No counselor role
      });
  }, [isAuthenticated, user]);

  return permissions;
}
