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
  timeout?: number; // Timeout in milliseconds (default: none)
}

/**
 * Wrapper around fetch that automatically adds authentication,
 * refreshes expired tokens, and handles session timeouts gracefully
 */
export async function apiFetch(endpoint: string, options: FetchOptions = {}) {
  const { skipAuth, _isRetry, timeout, ...fetchOptions } = options;

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

  // Set up timeout with AbortController if timeout is specified
  let timeoutId: NodeJS.Timeout | undefined;
  if (timeout) {
    const controller = new AbortController();
    fetchOptions.signal = controller.signal;

    timeoutId = setTimeout(() => {
      controller.abort();
    }, timeout);
  }

  // Construct full URL
  const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;

  try {
    const response = await fetch(url, fetchOptions);

    // Clear timeout if request completes successfully
    if (timeoutId) clearTimeout(timeoutId);

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
    // Clear timeout on error
    if (timeoutId) clearTimeout(timeoutId);

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
  externalOnly?: boolean;
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
    if (filters.externalOnly) params.append('externalOnly', 'true');
    if (filters.skip !== undefined) params.append('skip', String(filters.skip));
    if (filters.take !== undefined) params.append('take', String(filters.take));

    return apiGet(`/resources/organizations?${params.toString()}`, options);
  },
};

// Task & Assessment Types
export type TaskType = 'conversation_prompt' | 'offline_task' | 'guided_conversation';
export type TaskStatus = 'pending' | 'completed' | 'overdue';
export type AssessmentType = 'phq9' | 'gad7';
export type AssessmentStatus = 'pending' | 'completed';
export type WorkflowRuleLevel = 'platform' | 'organization' | 'counselor';

export interface MemberTask {
  id: string;
  memberId: string;
  type: TaskType;
  title: string;
  description: string;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
  status: TaskStatus;
  assignedById: string;
  assignedAt: string;
  completedAt?: string;
  completionMethod?: 'manual' | 'auto';
  counselorNotes?: string;
}

export interface TaskTemplate {
  id: string;
  type: TaskType;
  title: string;
  description: string;
  category: string;
}

export interface AssessedAssessment {
  id: string;
  memberId: string;
  type: AssessmentType;
  status: AssessmentStatus;
  assignedAt: string;
  completedAt?: string;
  dueDate?: string;
  score?: number;
  severity?: string;
  noteToMember?: string;
}

export interface WorkflowRule {
  id: string;
  level: WorkflowRuleLevel;
  name: string;
  description: string;
  trigger: string;
  conditions: any;
  actions: any;
  enabled: boolean;
  lastTriggered?: string;
  createdById?: string;
}

export interface WorkflowRuleActivity {
  id: string;
  ruleId: string;
  ruleName: string;
  memberId: string;
  triggeredAt: string;
  triggerReason: string;
  actionsTaken: string;
}

export interface MemberWellbeingHistoryItem {
  id: string;
  status: string;
  recordedAt: string;
  notes?: string;
  overriddenBy?: string;
}

export interface AssessmentHistoryItem {
  id: string;
  type: AssessmentType;
  score: number;
  severity: string;
  completedAt: string;
}

// Task API
export const taskApi = {
  getTemplates: () => apiGet('/counsel/tasks/templates'),

  create: (data: {
    memberId: string;
    type: TaskType;
    title: string;
    description: string;
    dueDate?: string;
    priority: 'low' | 'medium' | 'high';
    counselorNotes?: string;
  }) => apiPost('/counsel/tasks', data),

  getMemberTasks: (memberId: string) =>
    apiGet(`/counsel/tasks/member/${memberId}`),

  update: (taskId: string, data: {
    title?: string;
    description?: string;
    dueDate?: string;
    priority?: 'low' | 'medium' | 'high';
    counselorNotes?: string;
  }) => apiPatch(`/counsel/tasks/${taskId}`, data),

  delete: (taskId: string) => apiDelete(`/counsel/tasks/${taskId}`),

  sendReminder: (taskId: string) =>
    apiPost(`/counsel/tasks/${taskId}/remind`),

  // Member endpoints
  getMyTasks: () => apiGet('/counsel/tasks'),

  complete: (taskId: string) =>
    apiPatch(`/counsel/tasks/${taskId}/complete`, {}),
};

// Assessment API
export const assessmentApi = {
  assign: (data: {
    memberId: string;
    type: AssessmentType;
    dueDate?: string;
    noteToMember?: string;
  }) => apiPost('/counsel/assessments/assign', data),

  getMemberAssessments: (memberId: string) =>
    apiGet(`/counsel/assessments/member/${memberId}`),

  getAssessmentHistory: (memberId: string, type: AssessmentType) =>
    apiGet(`/counsel/assessments/member/${memberId}/history?type=${type}`),

  // Member endpoints
  getMyAssessments: () => apiGet('/counsel/assessments/assigned'),

  submit: (assessmentId: string, responses: any) =>
    apiPost(`/counsel/assessments/assigned/${assessmentId}/submit`, { responses }),
};

// Assessment Library API
export const assessmentLibraryApi = {
  list: (type?: 'custom_assessment' | 'custom_questionnaire') => {
    const params = type ? `?type=${type}` : '';
    return apiGet(`/counsel/assessments/library${params}`);
  },
  getById: (id: string) => apiGet(`/counsel/assessments/library/${id}`),
  create: (data: {
    name: string;
    type: 'custom_assessment' | 'custom_questionnaire';
    category?: string;
    questions: any[];
    scoringRules?: any;
  }) => apiPost('/counsel/assessments/library', data),
  update: (id: string, data: {
    name?: string;
    questions?: any[];
    scoringRules?: any;
    isActive?: boolean;
  }) => apiPatch(`/counsel/assessments/library/${id}`, data),
  delete: (id: string) => apiDelete(`/counsel/assessments/library/${id}`),
};

// Workflow Rules API
export const workflowRulesApi = {
  list: () => apiGet('/workflow/rules'),

  getMemberRules: (memberId: string) =>
    apiGet(`/workflow/rules/member/${memberId}`),

  getActivity: (memberId: string) =>
    apiGet(`/workflow/rules/member/${memberId}/activity`),

  create: (data: {
    name: string;
    description: string;
    trigger: string;
    conditions: any;
    actions: any;
    applyTo: 'member' | 'all' | 'organization';
    targetId?: string;
  }) => apiPost('/workflow/rules', data),

  update: (ruleId: string, data: { enabled?: boolean }) =>
    apiPatch(`/workflow/rules/${ruleId}`, data),

  delete: (ruleId: string) =>
    apiDelete(`/workflow/rules/${ruleId}`),
};

// Member History API
export const memberHistoryApi = {
  getWellbeingHistory: (memberId: string, days: number = 90) =>
    apiGet(`/counsel/members/${memberId}/history?days=${days}`),

  getAssessmentHistory: (memberId: string) =>
    apiGet(`/counsel/members/${memberId}/assessment-history`),

  getEventTimeline: (memberId: string) =>
    apiGet(`/counsel/members/${memberId}/events`),
};
