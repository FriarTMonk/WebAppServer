'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, OrganizationInvitation } from '@mychristiancounselor/shared';
import { getAccessToken, clearTokens } from '../lib/auth';
import axios from 'axios';

interface MorphSession {
  isMorphed: boolean;
  originalAdminId?: string;
  morphSessionId?: string;
  morphedUserEmail?: string;
  morphedUserName?: string;
}

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  morphSession: MorphSession | null;
  pendingInvitations: OrganizationInvitation[];
  logout: () => void;
  endMorph: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  fetchPendingInvitations: () => Promise<void>;
  acceptInvitation: (token: string) => Promise<void>;
  dismissInvitationBanner: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697') + '/v1';

// Helper function to decode JWT and extract payload
function decodeJWT(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode}) {
  const [user, setUser] = useState<User | null>(null);
  const [morphSession, setMorphSession] = useState<MorphSession | null>(null);
  const [pendingInvitations, setPendingInvitations] = useState<OrganizationInvitation[]>([]);
  const [invitationsDismissed, setInvitationsDismissed] = useState(false);
  const [_isInitialized, setIsInitialized] = useState(false);

  // Extract morph session info from JWT
  const updateMorphSession = (token: string | null) => {
    if (!token) {
      console.log('[MORPH DEBUG] No token, clearing morph session');
      setMorphSession(null);
      return;
    }

    const payload = decodeJWT(token);
    console.log('[MORPH DEBUG] JWT Payload:', payload);
    if (!payload) {
      console.log('[MORPH DEBUG] Failed to decode JWT, clearing morph session');
      setMorphSession(null);
      return;
    }

    if (payload.isMorphed && payload.originalAdminId && payload.morphSessionId) {
      console.log('[MORPH DEBUG] Setting morph session:', {
        isMorphed: true,
        originalAdminId: payload.originalAdminId,
        morphSessionId: payload.morphSessionId,
        morphedUserEmail: payload.email,
        morphedUserName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : undefined,
      });
      setMorphSession({
        isMorphed: true,
        originalAdminId: payload.originalAdminId,
        morphSessionId: payload.morphSessionId,
        morphedUserEmail: payload.email,
        morphedUserName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : undefined,
      });
    } else {
      console.log('[MORPH DEBUG] Not morphed, clearing morph session');
      setMorphSession(null);
    }
  };

  useEffect(() => {
    // Load user from API on mount if token exists
    const token = getAccessToken();
    if (token) {
      // Extract morph session info first
      updateMorphSession(token);

      fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch user');
          return res.json();
        })
        .then(data => {
          setUser(data);
          // Update morph session with user name once we have the user data
          updateMorphSession(token);
        })
        .catch(() => {
          clearTokens();
          setUser(null);
          setMorphSession(null);
          // Redirect to home page when session is invalid
          if (typeof window !== 'undefined' && window.location.pathname !== '/') {
            window.location.href = '/';
          }
        })
        .finally(() => setIsInitialized(true));
    } else {
      setIsInitialized(true);
    }
  }, []);

  // Update morph session when user changes
  useEffect(() => {
    const token = getAccessToken();
    if (token && user) {
      updateMorphSession(token);
    }
  }, [user]);

  // Set up axios interceptor to handle 401/403 globally
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        // If we get 401 or 403, session has expired
        if (error.response?.status === 401 || error.response?.status === 403) {
          // Clear tokens and user state
          clearTokens();
          setUser(null);

          // Redirect to home as guest if not already there
          if (typeof window !== 'undefined' && window.location.pathname !== '/') {
            window.location.href = '/';
          }
        }
        return Promise.reject(error);
      }
    );

    // Cleanup interceptor on unmount
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  const logout = () => {
    clearTokens();
    setUser(null);
    setMorphSession(null);
    // Always redirect to landing page after logout
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  const refreshAuth = async (): Promise<void> => {
    console.log('[REFRESH AUTH] Refreshing authentication state');
    const token = getAccessToken();
    if (!token) {
      console.log('[REFRESH AUTH] No token found');
      setUser(null);
      setMorphSession(null);
      return;
    }

    // Update morph session from token
    updateMorphSession(token);

    // Fetch fresh user data
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        console.log('[REFRESH AUTH] Failed to fetch user');
        clearTokens();
        setUser(null);
        setMorphSession(null);
        // Redirect to home page when session is invalid
        if (typeof window !== 'undefined' && window.location.pathname !== '/') {
          window.location.href = '/';
        }
        return;
      }

      const userData = await response.json();
      console.log('[REFRESH AUTH] User data refreshed:', userData);
      setUser(userData);

      // Update morph session again with user data
      updateMorphSession(token);
    } catch (error) {
      console.error('[REFRESH AUTH] Error:', error);
      clearTokens();
      setUser(null);
      setMorphSession(null);
      // Redirect to home page when session is invalid
      if (typeof window !== 'undefined' && window.location.pathname !== '/') {
        window.location.href = '/';
      }
    }
  };

  const fetchPendingInvitations = async (): Promise<void> => {
    const token = getAccessToken();
    if (!token || !user) {
      setPendingInvitations([]);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/organizations/invitations/my-pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const invitations = await response.json();
        setPendingInvitations(invitations);
        setInvitationsDismissed(false); // Reset dismissed state when new invitations are fetched
      } else {
        setPendingInvitations([]);
      }
    } catch (error) {
      console.error('Failed to fetch pending invitations:', error);
      setPendingInvitations([]);
    }
  };

  const acceptInvitation = async (token: string): Promise<void> => {
    const accessToken = getAccessToken();
    if (!accessToken) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await fetch(`${API_URL}/organizations/invitations/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to accept invitation');
      }

      // After accepting, refresh auth and fetch invitations again
      await refreshAuth();
      await fetchPendingInvitations();
    } catch (error) {
      console.error('Failed to accept invitation:', error);
      throw error;
    }
  };

  const dismissInvitationBanner = () => {
    setInvitationsDismissed(true);
  };

  const endMorph = async (): Promise<void> => {
    const token = getAccessToken();
    if (!token || !morphSession?.isMorphed) {
      throw new Error('No active morph session');
    }

    // Read and store the return URL FIRST, before updating any tokens or state
    // This prevents timing issues where token updates trigger auth redirects
    const returnUrl = typeof window !== 'undefined'
      ? (localStorage.getItem('morphReturnUrl') || '/admin')
      : '/admin';
    console.log('[MORPH END] Retrieved return URL:', returnUrl);

    try {
      const response = await fetch(`${API_URL}/admin/morph/end`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to end morph session');
      }

      const data = await response.json();

      // Clear the morph return URL from localStorage now that we have it in a variable
      if (typeof window !== 'undefined') {
        localStorage.removeItem('morphReturnUrl');
      }

      // Update token with restored admin token
      localStorage.setItem('accessToken', data.accessToken);

      // Fetch the restored admin user
      const userResponse = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${data.accessToken}` },
      });

      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUser(userData);
      }

      // Clear morph session
      setMorphSession(null);

      // Redirect to the page where morph was initiated
      if (typeof window !== 'undefined') {
        console.log('[MORPH END] Redirecting to:', returnUrl);
        window.location.href = returnUrl;
      }
    } catch (error) {
      console.error('Failed to end morph session:', error);
      throw error;
    }
  };

  // Fetch pending invitations when user logs in
  useEffect(() => {
    if (user) {
      fetchPendingInvitations();
    } else {
      setPendingInvitations([]);
      setInvitationsDismissed(false);
    }
  }, [user?.id]); // Only re-run when user ID changes

  // Filter invitations based on dismissed state
  const visibleInvitations = invitationsDismissed ? [] : pendingInvitations;

  return (
    <AuthContext.Provider value={{
      user,
      setUser,
      isAuthenticated: !!user,
      isLoading: !_isInitialized,
      morphSession,
      pendingInvitations: visibleInvitations,
      logout,
      endMorph,
      refreshAuth,
      fetchPendingInvitations,
      acceptInvitation,
      dismissInvitationBanner,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
