/**
 * Authenticated API fetch wrapper
 * Automatically handles session timeouts and token refresh
 */

import { getAccessToken, clearTokens, refreshAccessToken } from './auth';
import { showToast } from '../components/Toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
  _isRetry?: boolean; // Internal flag to prevent infinite retry loops
}

/**
 * Wrapper around fetch that automatically adds authentication,
 * refreshes expired tokens, and handles session timeouts gracefully
 */
export async function apiFetch(endpoint: string, options: FetchOptions = {}) {
  const { skipAuth, _isRetry, ...fetchOptions } = options;

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

  // Include credentials for CSRF protection (sends Origin header and cookies)
  fetchOptions.credentials = 'include';

  // Construct full URL
  const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;

  try {
    const response = await fetch(url, fetchOptions);

    // Handle authentication errors gracefully
    // 401 = Unauthorized (invalid/expired token) -> try to refresh, then redirect if refresh fails
    // 403 = Forbidden (valid token but insufficient permissions) -> just return response, let caller handle
    if (response.status === 401 && !_isRetry && !skipAuth) {
      console.log('[API] Access token expired (401), attempting refresh...');

      // Try to refresh the access token
      const refreshSuccess = await refreshAccessToken();

      if (refreshSuccess) {
        console.log('[API] Token refresh successful, retrying request');
        // Retry the original request with the new token
        return apiFetch(endpoint, { ...options, _isRetry: true });
      }

      // Refresh failed (refresh token expired or invalid) - session truly expired
      console.log('[API] Token refresh failed, session expired');

      // Clear authentication state
      clearTokens();

      // Only show toast and redirect if not already on home page
      // (prevents showing "signed out" message immediately after login)
      if (typeof window !== 'undefined' && window.location.pathname !== '/') {
        // Show friendly message to user
        showToast('Your session has timed out. Please log in again.', 'warning', 2500);

        // Redirect to home as anonymous after a short delay (let user see the message)
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      }

      // Return a rejected promise with a user-friendly message
      return Promise.reject(new Error('Session expired. Please log in again.'));
    }

    // For 403 (Forbidden), just return the response - let calling code decide how to handle
    // This allows components like UserMenu to gracefully handle permission checks

    return response;
  } catch (error) {
    // Silently handle AbortError (expected when component unmounts or request is cancelled)
    if (error instanceof Error && error.name === 'AbortError') {
      throw error; // Re-throw without logging - this is expected behavior
    }
    if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') {
      throw error; // Re-throw without logging - this is expected behavior
    }

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
 * Convenience method for PUT requests
 */
export async function apiPut(endpoint: string, data?: any, options: FetchOptions = {}) {
  return apiFetch(endpoint, {
    ...options,
    method: 'PUT',
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

/**
 * API object that wraps fetch methods to provide axios-like interface
 */
export const api = {
  get: async (endpoint: string, options: FetchOptions = {}) => {
    const response = await apiGet(endpoint, options);
    return { data: await response.json() };
  },
  post: async (endpoint: string, data?: any, options: FetchOptions = {}) => {
    const response = await apiPost(endpoint, data, options);
    return { data: await response.json() };
  },
  put: async (endpoint: string, data?: any, options: FetchOptions = {}) => {
    const response = await apiPut(endpoint, data, options);
    return { data: await response.json() };
  },
  patch: async (endpoint: string, data?: any, options: FetchOptions = {}) => {
    const response = await apiPatch(endpoint, data, options);
    return { data: await response.json() };
  },
  delete: async (endpoint: string, options: FetchOptions = {}) => {
    const response = await apiDelete(endpoint, options);
    return { data: await response.json() };
  },
};

// Book API helpers
export interface BookFilters {
  search?: string;
  genre?: string;
  visibilityTier?: string;
  showMatureContent?: boolean;
  skip?: number;
  take?: number;
  sort?: string;
}

/**
 * Interface for creating a new book submission.
 * Matches the backend CreateBookDto expectations.
 */
export interface CreateBookData {
  // Lookup methods (mutually exclusive with manual entry)
  isbn?: string;
  lookupUrl?: string;
  purchaseUrl?: string;

  // Manual entry fields (required if no ISBN/URL)
  title?: string;
  author?: string;

  // Optional fields for manual entry or override
  publisher?: string;
  publicationYear?: number;
  description?: string;
  coverImageUrl?: string;
}

export const bookApi = {
  list: (filters: BookFilters, options?: FetchOptions) => {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.genre && filters.genre !== 'all') params.append('genre', filters.genre);
    if (filters.visibilityTier && filters.visibilityTier !== 'all') params.append('visibilityTier', filters.visibilityTier);
    if (filters.showMatureContent !== undefined) params.append('showMatureContent', String(filters.showMatureContent));
    if (filters.skip !== undefined) params.append('skip', String(filters.skip));
    if (filters.take !== undefined) params.append('take', String(filters.take));
    // Note: API does not support sort parameter yet

    return apiGet(`/books?${params.toString()}`, options);
  },

  getById: (id: string) => apiGet(`/books/${id}`),

  create: (data: CreateBookData) => apiPost('/books', data),

  uploadPdf: (id: string, file: File, licenseType: string) => {
    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('pdfLicenseType', licenseType);
    // CRITICAL: Must use apiFetch directly with FormData body
    // apiPost() would stringify FormData to empty JSON object "{}"
    // Browser must set Content-Type: multipart/form-data with boundary
    return apiFetch(`/books/${id}/pdf`, {
      method: 'POST',
      body: formData, // FormData passed directly, not stringified
    });
  },
};

export interface OrganizationFilters {
  search?: string;
  organizationType?: string;
  city?: string;
  state?: string;
  skip?: number;
  take?: number;
}

export const organizationApi = {
  browse: (filters: OrganizationFilters, options?: FetchOptions) => {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.organizationType) params.append('organizationType', filters.organizationType);
    if (filters.city) params.append('city', filters.city);
    if (filters.state) params.append('state', filters.state);
    if (filters.skip !== undefined) params.append('skip', String(filters.skip));
    if (filters.take !== undefined) params.append('take', String(filters.take));

    return apiGet(`/resources/organizations?${params.toString()}`, options);
  },
};
