/**
 * Parables API client functions
 */

import { apiFetch } from './api';

export interface SaveParableRequest {
  reflectionNotes?: string;
}

export interface UpdateReflectionRequest {
  reflectionNotes: string;
  isCompleted?: boolean;
}

export interface UserParableListItem {
  id: string;
  userId: string;
  parableId: string;
  reflectionNotes: string | null;
  isCompleted: boolean;
  completedAt: Date | null;
  addedAt: Date;
  updatedAt: Date;
  parable: {
    id: string;
    slug: string;
    title: string;
    category: string;
    publishedDate: Date;
  };
}

/**
 * Save a parable to the user's reading list
 */
export async function saveParable(parableId: string, data?: SaveParableRequest) {
  const response = await apiFetch(`/parables/${parableId}/save`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data || {}),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to save parable' }));
    throw new Error(error.message || 'Failed to save parable');
  }

  return response.json();
}

/**
 * Remove a parable from the user's reading list
 */
export async function unsaveParable(parableId: string) {
  const response = await apiFetch(`/parables/${parableId}/unsave`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to remove parable' }));
    throw new Error(error.message || 'Failed to remove parable');
  }

  return response.json();
}

/**
 * Get the user's saved parables
 */
export async function getUserParables(): Promise<UserParableListItem[]> {
  const response = await apiFetch('/parables/my-list');

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch saved parables' }));
    throw new Error(error.message || 'Failed to fetch saved parables');
  }

  return response.json();
}

/**
 * Update reflection notes for a saved parable
 */
export async function updateParableReflection(parableId: string, data: UpdateReflectionRequest) {
  const response = await apiFetch(`/parables/${parableId}/reflection`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to update reflection' }));
    throw new Error(error.message || 'Failed to update reflection');
  }

  return response.json();
}

/**
 * Check if a parable is saved by the current user
 */
export async function isParableSaved(parableSlug: string): Promise<boolean> {
  try {
    const savedParables = await getUserParables();
    return savedParables.some(item => item.parable.slug === parableSlug);
  } catch (error) {
    console.error('Error checking if parable is saved:', error);
    return false;
  }
}
