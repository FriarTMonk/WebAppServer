'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { getAccessToken } from '../lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';

export function UserMenu() {
  const { user, logout, isAuthenticated, morphSession } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [_hasOrganizations, setHasOrganizations] = useState(false);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [isOrgAdmin, setIsOrgAdmin] = useState(false);

  useEffect(() => {
    console.log('[UserMenu] useEffect triggered - isAuthenticated:', isAuthenticated, 'user:', user?.email);
    if (isAuthenticated && user) {
      const token = getAccessToken();
      if (token) {
        // Check for organizations
        fetch(`${API_URL}/organizations`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then(res => res.ok ? res.json() : [])
          .then(data => setHasOrganizations(Array.isArray(data) && data.length > 0))
          .catch(() => setHasOrganizations(false));

        // Check if user is Platform Admin
        fetch(`${API_URL}/admin/health-check`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then(res => {
            console.log('[UserMenu] Platform admin check response:', res.status);
            if (res.ok) {
              return res.json();
            }
            throw new Error('Not a platform admin');
          })
          .then(data => {
            console.log('[UserMenu] Platform admin check data:', data);
            setIsPlatformAdmin(data.isPlatformAdmin === true);
          })
          .catch((err) => {
            console.error('[UserMenu] Platform admin check error:', err);
            setIsPlatformAdmin(false);
          });

        // Check if user is Organization Admin
        console.log('[UserMenu] Checking org admin status...');
        fetch(`${API_URL}/org-admin/organization`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then(res => {
            console.log('[UserMenu] Org admin check response:', res.status);
            if (res.ok) {
              return res.json().then(data => {
                console.log('[UserMenu] Org admin check succeeded:', data);
                setIsOrgAdmin(true);
              });
            } else {
              return res.json().then(errorData => {
                console.log('[UserMenu] Org admin check failed:', res.status, errorData);
                setIsOrgAdmin(false);
              }).catch(() => {
                console.log('[UserMenu] Org admin check failed:', res.status);
                setIsOrgAdmin(false);
              });
            }
          })
          .catch((err) => {
            console.error('[UserMenu] Org admin check error:', err);
            setIsOrgAdmin(false);
          });
      }
    } else {
      // Reset states when user logs out
      console.log('[UserMenu] Resetting admin states (not authenticated or no user)');
      setHasOrganizations(false);
      setIsPlatformAdmin(false);
      setIsOrgAdmin(false);
    }
  }, [isAuthenticated, user]);

  if (!isAuthenticated) {
    return (
      <div className="flex gap-2">
        <button
          onClick={() => router.push('/login')}
          className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          Sign in
        </button>
        <button
          onClick={() => router.push('/register')}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          Sign up
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
      >
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
          {user?.firstName?.[0] || user?.email[0].toUpperCase()}
        </div>
        <span>{user?.firstName || user?.email}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
          <div className="px-4 py-2 text-sm text-gray-700 border-b">
            {user?.email}
          </div>
          <button
            onClick={() => {
              setIsOpen(false);
              router.push('/profile');
            }}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Profile
          </button>
          <button
            onClick={() => {
              setIsOpen(false);
              router.push('/history');
            }}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Journal
          </button>
          {isOrgAdmin && !isPlatformAdmin && (
            <button
              onClick={() => {
                setIsOpen(false);
                router.push('/org-admin');
              }}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Organization Admin
            </button>
          )}
          {isPlatformAdmin && (
            <button
              onClick={() => {
                setIsOpen(false);
                router.push('/admin');
              }}
              className="block w-full text-left px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 border-t border-gray-200"
            >
              Admin
            </button>
          )}
          {morphSession?.isMorphed ? (
            <div className="px-4 py-3 text-sm text-yellow-800 bg-yellow-50 border-t border-gray-200">
              <p className="font-semibold mb-1">Morphed Session Active</p>
              <p className="text-xs">Use the "End Morph Session" button in the yellow banner above to return to your admin account.</p>
            </div>
          ) : (
            <button
              onClick={() => {
                setIsOpen(false);
                logout();
                router.push('/');
              }}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Sign out
            </button>
          )}
        </div>
      )}
    </div>
  );
}
