import pageLabels from '@/config/page-labels.json';

/**
 * Check if a path is a sub-page (detail, new, edit)
 * Sub-pages are identified by:
 * - Dynamic route segments containing [ and ] (e.g., /resources/books/[id])
 * - Paths ending with /new
 * - Paths ending with /edit
 *
 * @param path - The path to check (with or without query parameters)
 * @returns true if the path is a sub-page, false otherwise
 */
export function isSubPage(path: string): boolean {
  // Strip query parameters
  const pathWithoutQuery = path.split('?')[0];

  // Check for dynamic route segments [id], [slug], etc.
  if (pathWithoutQuery.includes('[') && pathWithoutQuery.includes(']')) {
    return true;
  }

  // Check if path ends with /new or /edit
  if (pathWithoutQuery.endsWith('/new') || pathWithoutQuery.endsWith('/edit')) {
    return true;
  }

  return false;
}

/**
 * Get parent path by removing last segment
 * Example: /resources/books/123 → /resources/books
 *
 * @param path - The path to get parent from
 * @returns The parent path, or /home if result would be empty
 */
export function getParentPath(path: string): string {
  // Strip query parameters
  const pathWithoutQuery = path.split('?')[0];

  // Split into segments and filter out empty strings
  const segments = pathWithoutQuery.split('/').filter(s => s.length > 0);

  // If no segments or only one segment, return /home
  if (segments.length <= 1) {
    return '/home';
  }

  // Remove last segment and rejoin
  segments.pop();
  const parentPath = '/' + segments.join('/');

  return parentPath || '/home';
}

/**
 * Get valid referrer for navigation links
 * If current path is a sub-page, returns its parent path
 * If current path is NOT a sub-page, returns the current path itself
 * This prevents sub-pages from becoming referrers (loop prevention)
 *
 * @param currentPath - The current page path
 * @returns The valid referrer path to use
 */
export function getValidReferrer(currentPath: string): string {
  if (isSubPage(currentPath)) {
    return getParentPath(currentPath);
  }

  // Strip query parameters and return the current path
  return currentPath.split('?')[0];
}

/**
 * Build link with from query parameter
 * Gets valid referrer from current path and appends it to target path
 *
 * @param targetPath - The target path to link to
 * @param currentPath - The current page path
 * @returns The target path with from parameter appended
 */
export function buildLinkWithReferrer(targetPath: string, currentPath: string): string {
  const referrer = getValidReferrer(currentPath);
  const encodedReferrer = encodeURIComponent(referrer);

  // Check if target already has query parameters
  const separator = targetPath.includes('?') ? '&' : '?';

  return `${targetPath}${separator}from=${encodedReferrer}`;
}

/**
 * Get human-readable label for a page path
 * Looks up the label in page-labels.json configuration
 *
 * @param path - The page path to get label for
 * @returns The human-readable page label, or 'Previous Page' as fallback
 */
export function getPageLabel(path: string): string {
  // Strip query parameters from path before lookup
  const pathWithoutQuery = path.split('?')[0];

  // Type assertion for the imported JSON
  const labels = pageLabels as Record<string, string>;

  // Return label from config or fallback
  return labels[pathWithoutQuery] || 'Previous Page';
}
