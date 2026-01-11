'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { getPageLabel } from '@/lib/navigation-utils';

/**
 * Context-aware back button component
 *
 * Reads 'from' query parameter to determine where to navigate back to.
 * Falls back to /home if no from parameter exists.
 * Displays "Back to [Page Label]" based on configuration.
 *
 * @example
 * ```tsx
 * <BackButton />
 * ```
 *
 * Do NOT use on /home page - it's the root navigation page.
 */
export function BackButton() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const from = searchParams.get('from') || '/home';
  const label = getPageLabel(from);

  return (
    <button
      type="button"
      onClick={() => router.push(from)}
      className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
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
