'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { parseTrail, getTrailForBack, getPageLabel } from '@/lib/navigation-utils';

/**
 * Internal back button component that uses searchParams
 */
function BackButtonContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Parse trail from URL
  const trailParam = searchParams.get('trail');
  const trail = parseTrail(trailParam);

  // Get back navigation info
  const backInfo = getTrailForBack(trail);

  // If no trail and we're at /home, hide back button
  if (!backInfo && pathname === '/home') {
    return null;
  }

  // If no trail but not at /home, provide fallback to /home
  let backPath: string;
  let label: string;
  let backUrl: string;

  if (!backInfo) {
    backPath = '/home';
    label = 'Home';
    backUrl = '/home';
  } else {
    const { path, trail: newTrail } = backInfo;
    backPath = path;
    label = getPageLabel(backPath);
    backUrl = newTrail ? `${backPath}?trail=${newTrail}` : backPath;
  }

  return (
    <button
      type="button"
      onClick={() => router.push(backUrl)}
      className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
      aria-label={`Navigate back to ${label}`}
    >
      <svg
        className="w-5 h-5 mr-2"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 19l-7-7 7-7"
        />
      </svg>
      <span>Back to {label}</span>
    </button>
  );
}

/**
 * Context-aware back button component
 *
 * Reads 'trail' query parameter to determine where to navigate back to.
 * Navigates to the last page in the trail and removes it from the chain.
 * Hides when trail is empty (at root page with no history).
 *
 * @example
 * ```tsx
 * <BackButton />
 * ```
 *
 * Automatically hides when there's no navigation history.
 */
export function BackButton() {
  return (
    <Suspense fallback={<div className="h-10 mb-4" />}>
      <BackButtonContent />
    </Suspense>
  );
}
