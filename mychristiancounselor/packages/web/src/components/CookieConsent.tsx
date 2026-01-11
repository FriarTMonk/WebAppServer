'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { buildLinkWithTrail, parseTrail } from '@/lib/navigation-utils';

/**
 * Cookie Consent Banner
 *
 * Unix Principles Applied:
 * - Do one thing: Get user consent for cookies
 * - Simple: Clear message, two choices
 * - Store preference: localStorage (no backend needed)
 *
 * GDPR Requirements Met:
 * - User must give explicit consent before non-essential cookies
 * - Clear explanation of what cookies are used for
 * - Link to privacy policy for full details
 * - Easy way to accept or decline
 *
 * Cookie Usage:
 * - Essential: Authentication session (JWT in localStorage - not a cookie)
 * - Essential: Session management and security
 * - No tracking or advertising cookies
 */
function CookieConsentContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showBanner, setShowBanner] = useState(false);

  const trailParam = searchParams.get('trail');
  const trail = parseTrail(trailParam);

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem('cookieConsent');
    if (consent) {
      return; // Already made a choice, don't show banner
    }

    // Show banner after a short delay (better UX)
    const timer = setTimeout(() => setShowBanner(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookieConsent', 'accepted');
    setShowBanner(false);
  };

  const handleDecline = () => {
    localStorage.setItem('cookieConsent', 'declined');
    setShowBanner(false);
    // Note: Our app uses JWT in localStorage, not cookies for auth
    // So declining doesn't affect core functionality
  };

  if (!showBanner) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Message */}
          <div className="flex-1">
            <p className="text-sm leading-relaxed">
              We use essential cookies for authentication and session management.
              We do not use tracking or advertising cookies.{' '}
              <Link
                href={buildLinkWithTrail('/legal/privacy', pathname, trail)}
                className="underline hover:text-teal-300 transition-colors"
              >
                Learn more in our Privacy Policy
              </Link>
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 flex-shrink-0">
            <button
              onClick={handleDecline}
              className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
            >
              Decline
            </button>
            <button
              onClick={handleAccept}
              className="px-6 py-2 text-sm font-medium bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CookieConsent() {
  return (
    <Suspense fallback={null}>
      <CookieConsentContent />
    </Suspense>
  );
}
