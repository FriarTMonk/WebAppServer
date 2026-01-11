import pageLabels from '@/config/page-labels.json';

/**
 * Check if a path is a sub-page (detail, new, edit)
 * Sub-pages are identified by:
 * - Dynamic route segments containing [ and ] (e.g., /resources/books/[id])
 * - Paths ending with /new
 * - Paths ending with /edit
 * - Paths that appear to be detail pages (e.g., /resources/books/some-uuid)
 *
 * @param path - The path to check (with or without query parameters)
 * @returns true if the path is a sub-page, false otherwise
 */
export function isSubPage(path: string): boolean {
  // Strip query parameters
  const pathWithoutQuery = path.split('?')[0];

  // Check for dynamic route segments [id], [slug], etc. (filesystem paths)
  if (pathWithoutQuery.includes('[') && pathWithoutQuery.includes(']')) {
    return true;
  }

  // Check if path ends with /new or /edit
  if (pathWithoutQuery.endsWith('/new') || pathWithoutQuery.endsWith('/edit')) {
    return true;
  }

  // Detect runtime dynamic routes (detail pages)
  // These are paths with an extra segment after a known parent path
  // Examples:
  // - /resources/books/uuid → sub-page
  // - /admin/users/uuid → sub-page
  // - /org-admin/members/uuid → sub-page
  const segments = pathWithoutQuery.split('/').filter(s => s.length > 0);

  // Check known patterns for detail pages
  if (segments.length >= 3) {
    // Pattern: /resources/books/{id}
    if (segments[0] === 'resources' && segments[1] === 'books' && segments.length === 3) {
      return true;
    }

    // Pattern: /admin/users/{id}
    if (segments[0] === 'admin' && segments[1] === 'users' && segments.length === 3) {
      return true;
    }

    // Pattern: /admin/organizations/{id}
    if (segments[0] === 'admin' && segments[1] === 'organizations' && segments.length === 3) {
      return true;
    }

    // Pattern: /org-admin/members/{id}
    if (segments[0] === 'org-admin' && segments[1] === 'members' && segments.length === 3) {
      return true;
    }

    // Pattern: /support/tickets/{id}
    if (segments[0] === 'support' && segments[1] === 'tickets' && segments.length === 3) {
      return true;
    }

    // Pattern: /marketing/campaigns/{id}
    if (segments[0] === 'marketing' && segments[1] === 'campaigns' && segments.length === 3) {
      return true;
    }

    // Pattern: /marketing/prospects/{id}
    if (segments[0] === 'marketing' && segments[1] === 'prospects' && segments.length === 3) {
      return true;
    }

    // Pattern: /counsel/member/{id}/journal
    if (segments[0] === 'counsel' && segments[1] === 'member') {
      return true;
    }
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
 * Preserves the 'from' query parameter to maintain navigation chain
 *
 * @param currentPath - The current page path (with or without query params)
 * @returns The valid referrer path to use (may include from parameter)
 */
export function getValidReferrer(currentPath: string): string {
  // Split path and query string
  const [pathOnly, queryString] = currentPath.split('?');

  // Determine the referrer path
  const referrerPath = isSubPage(pathOnly) ? getParentPath(pathOnly) : pathOnly;

  // If there's a 'from' parameter in the current URL, preserve it
  if (queryString) {
    const params = new URLSearchParams(queryString);
    const fromParam = params.get('from');
    if (fromParam) {
      return `${referrerPath}?from=${encodeURIComponent(fromParam)}`;
    }
  }

  return referrerPath;
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
 * Uses imported page labels configuration from @/config/page-labels.json
 *
 * @param path - The page path to get label for
 * @returns The human-readable page label, or 'Previous Page' as fallback
 */
export function getPageLabel(path: string): string {
  // Strip query parameters from path before lookup
  const pathWithoutQuery = path.split('?')[0];

  // Look up label from imported configuration
  const labels = pageLabels as Record<string, string>;

  // Return label from config or fallback
  return labels[pathWithoutQuery] || 'Previous Page';
}

/**
 * Parse trail query parameter into array of paths
 * Handles malformed input gracefully
 *
 * @param trailParam - Raw trail string from URL (comma-separated paths)
 * @returns Array of paths, empty array if invalid
 *
 * @example
 * parseTrail('/home,/org-admin') → ['/home', '/org-admin']
 * parseTrail('invalid') → []
 * parseTrail(null) → []
 */
export function parseTrail(trailParam: string | null): string[] {
  if (!trailParam || typeof trailParam !== 'string') {
    return [];
  }

  try {
    // Decode URI component in case paths are encoded
    const decoded = decodeURIComponent(trailParam);

    // Split by comma and filter out empty strings
    const paths = decoded.split(',').filter(p => p.trim().length > 0);

    // Validate that each path starts with /
    const validPaths = paths.filter(p => p.startsWith('/'));

    if (validPaths.length !== paths.length) {
      console.warn('Invalid trail parameter - some paths do not start with /:', trailParam);
    }

    return validPaths;
  } catch (error) {
    console.warn('Failed to parse trail parameter:', trailParam, error);
    return [];
  }
}

/**
 * Encode trail array to URL parameter string
 *
 * @param trail - Array of paths
 * @returns Comma-separated, URL-encoded string
 *
 * @example
 * encodeTrail(['/home', '/org-admin']) → '%2Fhome%2C%2Forg-admin'
 * encodeTrail([]) → ''
 */
export function encodeTrail(trail: string[]): string {
  if (!trail || trail.length === 0) {
    return '';
  }

  // Trim whitespace and validate paths
  const validPaths = trail
    .map(p => typeof p === 'string' ? p.trim() : '')
    .filter(p => {
      if (!p.startsWith('/')) {
        if (p.length > 0) {
          console.warn('Invalid trail path - must start with /:', p);
        }
        return false;
      }
      return true;
    });

  if (validPaths.length === 0) {
    return '';
  }

  // Join with comma and encode for URL safety
  return encodeURIComponent(validPaths.join(','));
}

/**
 * Check if a path should be added to the breadcrumb trail
 * Sub-pages (detail pages, /new, /edit) should NOT be added
 *
 * @param path - Path to check (without query parameters)
 * @returns true if should add to trail, false otherwise
 *
 * @example
 * shouldAddToTrail('/resources/books') → true
 * shouldAddToTrail('/resources/books/abc-123') → false (detail page)
 * shouldAddToTrail('/resources/books/new') → false (new page)
 */
export function shouldAddToTrail(path: string): boolean {
  // Strip query parameters
  const pathWithoutQuery = path.split('?')[0];

  // Sub-pages should not be added to trail
  return !isSubPage(pathWithoutQuery);
}
