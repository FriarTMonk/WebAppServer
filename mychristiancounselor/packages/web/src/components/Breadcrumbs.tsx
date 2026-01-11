'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { parseTrail, encodeTrail, getPageLabel } from '@/lib/navigation-utils';

/**
 * Internal breadcrumbs component that uses searchParams
 */
function BreadcrumbsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Parse trail from URL
  const trailParam = searchParams.get('trail');
  const trail = parseTrail(trailParam);

  // If no trail and we're at /home, don't show breadcrumbs
  if (pathname === '/home' || (trail.length === 0 && pathname !== '/home')) {
    return null;
  }

  // Build breadcrumb items: trail + current page
  const breadcrumbItems = [...trail];

  // Add Home as first item if not already there
  if (breadcrumbItems.length === 0 || breadcrumbItems[0] !== '/home') {
    breadcrumbItems.unshift('/home');
  }

  // Handle breadcrumb click - navigate with truncated trail
  const handleBreadcrumbClick = (clickedPath: string, clickedIndex: number) => {
    // New trail is everything before the clicked item
    const newTrail = breadcrumbItems.slice(0, clickedIndex);
    const encodedTrail = encodeTrail(newTrail);

    // Navigate with new trail
    const url = encodedTrail ? `${clickedPath}?trail=${encodedTrail}` : clickedPath;
    router.push(url);
  };

  return (
    <nav aria-label="Breadcrumb" className="mb-4 px-4">
      <ol className="flex items-center space-x-2 text-sm text-gray-600">
        {breadcrumbItems.map((path, index) => {
          const label = getPageLabel(path);
          const isLast = index === breadcrumbItems.length - 1;

          return (
            <li key={path} className="flex items-center">
              {index > 0 && (
                <span aria-hidden="true" className="mr-2">
                  /
                </span>
              )}
              {isLast ? (
                <span className="text-gray-900 font-medium" aria-current="page">
                  {label}
                </span>
              ) : (
                <button
                  onClick={() => handleBreadcrumbClick(path, index)}
                  className="hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                >
                  {label}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Breadcrumb navigation component
 *
 * Displays full navigation trail at top of page.
 * Reads trail from URL query parameter.
 * Each breadcrumb is clickable to jump back multiple levels.
 *
 * @example
 * // URL: /org-admin/resources/books?trail=/home,/org-admin
 * // Renders: Home / Org Admin / Books
 * <Breadcrumbs />
 *
 * Do NOT use on /home page - breadcrumbs automatically hide there.
 */
export function Breadcrumbs() {
  return (
    <Suspense fallback={<div className="h-8 mb-4" />}>
      <BreadcrumbsContent />
    </Suspense>
  );
}
