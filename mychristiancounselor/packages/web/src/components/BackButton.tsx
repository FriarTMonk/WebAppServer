'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { getPageLabel } from '@/lib/navigation-utils';

export function BackButton() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const from = searchParams.get('from') || '/home';
  const label = getPageLabel(from);

  return (
    <button
      onClick={() => router.push(from)}
      className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-4"
    >
      <svg
        className="w-5 h-5 mr-2"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
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
