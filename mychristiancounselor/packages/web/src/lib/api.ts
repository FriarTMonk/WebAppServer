/**
 * Authenticated API fetch wrapper
 * Automatically handles session timeouts and redirects to home on 401/403
 */

import { getAccessToken, clearTokens } from './auth';
import { showToast } from '../components/Toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
}

/**
 * Wrapper around fetch that automatically adds authentication
 * and handles session timeouts gracefully
 */
export async function apiFetch(endpoint: string, options: FetchOptions = {}) {
  const { skipAuth, ...fetchOptions } = options;

  // Add authorization header if not skipping auth
  if (!skipAuth) {
    const token = getAccessToken();
    if (token) {
      fetchOptions.headers = {
        ...fetchOptions.headers,
        Authorization: `Bearer ${token}`,
      };
    }
  }

  // Construct full URL
  const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;

  try {
    const response = await fetch(url, fetchOptions);

    // Handle authentication errors gracefully
    if (response.status === 401 || response.status === 403) {
      console.log('[API] Session expired, redirecting to home');

      // Show friendly message to user
      showToast('Your session has timed out. Redirecting to home...', 'warning', 2500);

      // Clear authentication state
      clearTokens();

      // Redirect to home as anonymous after a short delay (let user see the message)
      if (typeof window !== 'undefined' && window.location.pathname !== '/') {
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      }

      // Return a rejected promise with a user-friendly message
      // This allows calling code to handle it if needed
      return Promise.reject(new Error('Session expired. Redirecting to home...'));
    }

    return response;
  } catch (error) {
    // Network errors, etc.
    console.error('[API] Fetch error:', error);
    throw error;
  }
}

/**
 * Convenience method for GET requests
 */
export async function apiGet(endpoint: string, options: FetchOptions = {}) {
  return apiFetch(endpoint, { ...options, method: 'GET' });
}

/**
 * Convenience method for POST requests
 */
export async function apiPost(endpoint: string, data?: any, options: FetchOptions = {}) {
  return apiFetch(endpoint, {
    ...options,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * Convenience method for PATCH requests
 */
export async function apiPatch(endpoint: string, data?: any, options: FetchOptions = {}) {
  return apiFetch(endpoint, {
    ...options,
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * Convenience method for DELETE requests
 */
export async function apiDelete(endpoint: string, options: FetchOptions = {}) {
  return apiFetch(endpoint, { ...options, method: 'DELETE' });
}
