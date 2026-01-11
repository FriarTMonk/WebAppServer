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

/**
 * Build new trail when navigating from current page to target page
 * Handles circular navigation, sub-pages, and trail truncation
 *
 * @param currentPath - Current page path (without query)
 * @param currentTrail - Current trail array
 * @param targetPath - Target page path (without query)
 * @returns New trail array
 *
 * @example
 * buildTrail('/home', [], '/org-admin') → ['/home']
 * buildTrail('/org-admin', ['/home'], '/resources/books') → ['/home', '/org-admin']
 * buildTrail('/books', ['/home', '/org-admin', '/books'], '/org-admin') → ['/home'] (backtracking)
 */
export function buildTrail(
  currentPath: string,
  currentTrail: string[],
  targetPath: string
): string[] {
  // Strip query parameters
  const cleanCurrentPath = currentPath.split('?')[0];
  const cleanTargetPath = targetPath.split('?')[0];

  // If navigating to same page, return trail unchanged
  if (cleanCurrentPath === cleanTargetPath) {
    return currentTrail;
  }

  // Check if target is already in trail (user is backtracking)
  if (currentTrail.includes(cleanTargetPath)) {
    const index = currentTrail.indexOf(cleanTargetPath);
    return currentTrail.slice(0, index);
  }

  // If current page should not be in trail (sub-page), use parent's trail
  let newTrail = [...currentTrail];

  // Add current page to trail if it should be there
  if (shouldAddToTrail(cleanCurrentPath) && !currentTrail.includes(cleanCurrentPath)) {
    newTrail.push(cleanCurrentPath);
  }

  // Check trail depth and log warnings
  if (newTrail.length >= 9) {
    console.error('⚠️ Breadcrumb trail depth critical:', newTrail.length, newTrail);
  } else if (newTrail.length >= 6) {
    console.warn('⚠️ Breadcrumb trail unusually deep:', newTrail.length, newTrail);
  }

  return newTrail;
}

/**
 * Get navigation info for back button
 * Returns path to navigate to and updated trail
 *
 * @param currentTrail - Current trail array
 * @returns {path, trail} for back navigation, or null if trail is empty
 *
 * @example
 * getTrailForBack(['/home', '/org-admin']) → { path: '/org-admin', trail: '/home' }
 * getTrailForBack(['/home']) → { path: '/home', trail: '' }
 * getTrailForBack([]) → null
 */
export function getTrailForBack(currentTrail: string[]): {
  path: string;
  trail: string;
} | null {
  if (!currentTrail || currentTrail.length === 0) {
    return null;
  }

  // Last item in trail is where we go back to
  const backPath = currentTrail[currentTrail.length - 1];

  // New trail excludes the last item
  const newTrail = currentTrail.slice(0, -1);

  return {
    path: backPath,
    trail: encodeTrail(newTrail),
  };
}

/**
 * Build link URL with trail parameter
 * Replaces buildLinkWithReferrer() for new trail system
 *
 * @param targetPath - Target page path
 * @param currentPath - Current page path (from usePathname())
 * @param currentTrail - Current trail array (from parseTrail())
 * @returns Complete URL with trail parameter
 *
 * @example
 * buildLinkWithTrail('/org-admin', '/home', [])
 *   → '/org-admin?trail=%2Fhome'
 *
 * buildLinkWithTrail('/resources/books', '/org-admin', ['/home'])
 *   → '/resources/books?trail=%2Fhome%2C%2Forg-admin'
 */
export function buildLinkWithTrail(
  targetPath: string,
  currentPath: string,
  currentTrail: string[]
): string {
  // Build new trail for this navigation
  const newTrail = buildTrail(currentPath, currentTrail, targetPath);

  // Encode trail for URL
  const encodedTrail = encodeTrail(newTrail);

  // If trail is empty, don't add parameter
  if (!encodedTrail) {
    return targetPath;
  }

  // Check if target already has query parameters
  const separator = targetPath.includes('?') ? '&' : '?';

  return `${targetPath}${separator}trail=${encodedTrail}`;
}
