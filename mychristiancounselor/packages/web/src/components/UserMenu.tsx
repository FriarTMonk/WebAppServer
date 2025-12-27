'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTour } from '../contexts/TourContext';
import { useRouter, usePathname } from 'next/navigation';
import { apiGet } from '../lib/api';
import { getTourForPage, getPageName } from '../config/tours';

export function UserMenu() {
  const { user, logout, isAuthenticated, morphSession } = useAuth();
  const { startTour } = useTour();
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [_hasOrganizations, setHasOrganizations] = useState(false);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [isSalesRep, setIsSalesRep] = useState(false);
  const [isOrgAdmin, setIsOrgAdmin] = useState(false);
  const [isCounselor, setIsCounselor] = useState(false);
  const [hasJournalAccess, setHasJournalAccess] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  useEffect(() => {
    console.log('[UserMenu] useEffect triggered - isAuthenticated:', isAuthenticated, 'user:', user?.email);
    if (isAuthenticated && user) {
      // Check for organizations
      apiGet('/organizations')
        .then(res => res.ok ? res.json() : [])
        .then(data => setHasOrganizations(Array.isArray(data) && data.length > 0))
        .catch(() => setHasOrganizations(false));

      // Check if user is Platform Admin or Sales Rep
      apiGet('/admin/health-check')
        .then(res => {
          console.log('[UserMenu] Admin/Sales check response:', res.status);
          if (res.ok) {
            return res.json();
          }
          throw new Error('Not a platform admin or sales rep');
        })
        .then(data => {
          console.log('[UserMenu] Admin/Sales check data:', data);
          setIsPlatformAdmin(data.isPlatformAdmin === true);
          setIsSalesRep(data.isSalesRep === true);
        })
        .catch((err) => {
          console.error('[UserMenu] Admin/Sales check error:', err);
          setIsPlatformAdmin(false);
          setIsSalesRep(false);
        });

      // Check if user is Organization Admin
      console.log('[UserMenu] Checking org admin status...');
      apiGet('/org-admin/organization')
        .then(res => {
          console.log('[UserMenu] Org admin check response:', res.status);
          if (res.ok) {
            return res.json().then(data => {
              console.log('[UserMenu] Org admin check succeeded:', data);
              setIsOrgAdmin(true);
            });
          } else {
            return res.json().then(errorData => {
              console.log('[UserMenu] Org admin check failed:', res.status, errorData);
              setIsOrgAdmin(false);
            }).catch(() => {
              console.log('[UserMenu] Org admin check failed:', res.status);
              setIsOrgAdmin(false);
            });
          }
        })
        .catch((err) => {
          console.error('[UserMenu] Org admin check error:', err);
          setIsOrgAdmin(false);
        });

      // Check if user has Counselor role in any organization
      console.log('[UserMenu] Checking counselor role status...');
      apiGet('/profile/organizations')
        .then(res => {
          console.log('[UserMenu] Organizations check response:', res.status);
          if (res.ok) {
            res.json().then(orgs => {
              console.log('[UserMenu] User organizations:', orgs);
              // Check if user has Counselor role in any organization
              const hasCounselorRole = Array.isArray(orgs) &&
                orgs.some(org => org.role?.name?.includes('Counselor'));
              console.log('[UserMenu] Has counselor role:', hasCounselorRole);
              setIsCounselor(hasCounselorRole);

              // Check journal access: user has access if they have an active subscription OR are part of an organization
              const hasOrgs = Array.isArray(orgs) && orgs.length > 0;
              const hasActiveSubscription = user?.subscriptionStatus === 'active';
              const hasAccess = hasActiveSubscription || hasOrgs;
              console.log('[UserMenu] Journal access check:', { hasOrgs, hasActiveSubscription, hasAccess });
              setHasJournalAccess(hasAccess);
            });
          } else {
            console.log('[UserMenu] Organizations check failed:', res.status);
            setIsCounselor(false);
            // If no organizations, check if user has active subscription
            const hasActiveSubscription = user?.subscriptionStatus === 'active';
            setHasJournalAccess(hasActiveSubscription);
          }
        })
        .catch((err) => {
          console.error('[UserMenu] Organizations check error:', err);
          setIsCounselor(false);
          // If error fetching organizations, check if user has active subscription
          const hasActiveSubscription = user?.subscriptionStatus === 'active';
          setHasJournalAccess(hasActiveSubscription);
        });
    } else {
      // Reset states when user logs out
      console.log('[UserMenu] Resetting admin states (not authenticated or no user)');
      setHasOrganizations(false);
      setIsPlatformAdmin(false);
      setIsSalesRep(false);
      setIsOrgAdmin(false);
      setIsCounselor(false);
      setHasJournalAccess(false);
    }
  }, [isAuthenticated, user]);

  if (!isAuthenticated) {
    return (
      <div className="flex gap-2">
        <button
          onClick={() => router.push('/login')}
          className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          Sign in
        </button>
        <button
          onClick={() => router.push('/register')}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          Sign up
        </button>
      </div>
    );
  }

  // Get tour for current page
  const currentPageTour = getTourForPage(pathname);

  const handleStartTour = () => {
    if (currentPageTour) {
      setIsOpen(false);
      startTour(currentPageTour.tourId, currentPageTour.steps);
    }
  };

  const handleNavigateToResources = (path: string) => () => {
    setIsOpen(false);
    router.push(path);
  };

  return (
    <div className="relative user-menu">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
      >
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
          {user?.firstName?.[0] || user?.email[0].toUpperCase()}
        </div>
        <span>{user?.firstName || user?.email}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
          <div className="px-4 py-2 text-sm text-gray-700 border-b">
            {user?.email}
          </div>
          {currentPageTour && (
            <button
              onClick={handleStartTour}
              className="block w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 font-medium border-b border-gray-200"
            >
              📖 Page Tour: {getPageName(currentPageTour.tourId)}
            </button>
          )}
          <button
            onClick={() => {
              setIsOpen(false);
              router.push('/profile');
            }}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Profile
          </button>
          <button
            onClick={() => {
              setIsOpen(false);
              if (hasJournalAccess) {
                router.push('/history');
              } else {
                setShowSubscriptionModal(true);
              }
            }}
            className={`block w-full text-left px-4 py-2 text-sm ${
              hasJournalAccess
                ? 'text-gray-700 hover:bg-gray-100'
                : 'text-gray-400 cursor-not-allowed bg-gray-50'
            }`}
          >
            Journal
          </button>
          {/* Resources Submenu */}
          <div className="border-t border-gray-200" role="group" aria-label="Resources">
            <button
              onClick={handleNavigateToResources('/resources/books')}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              role="menuitem"
            >
              Browse Books
            </button>
            <button
              onClick={handleNavigateToResources('/resources/reading-list')}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              role="menuitem"
            >
              My Reading List
            </button>
            <button
              onClick={handleNavigateToResources('/resources/organizations')}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              role="menuitem"
            >
              Browse Organizations
            </button>
            <button
              onClick={handleNavigateToResources('/resources/recommended')}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              role="menuitem"
            >
              Recommended for Me
            </button>
          </div>
          {isCounselor && (
            <button
              onClick={() => {
                setIsOpen(false);
                router.push('/counsel');
              }}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Counselor
            </button>
          )}
          {isSalesRep && (
            <button
              onClick={() => {
                setIsOpen(false);
                router.push('/admin/sales');
              }}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Sales Queue
            </button>
          )}
          {isOrgAdmin && !isPlatformAdmin && (
            <button
              onClick={() => {
                setIsOpen(false);
                router.push('/org-admin');
              }}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Organization Admin
            </button>
          )}
          {isPlatformAdmin && (
            <button
              onClick={() => {
                setIsOpen(false);
                router.push('/admin');
              }}
              className="block w-full text-left px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 border-t border-gray-200"
            >
              Admin
            </button>
          )}
          <a
            href={`mailto:support@mychristiancounselor.online?subject=Support%20Request&body=Please%20describe%20your%20issue%3A%0A%0A%0A%0AWhat%20were%20you%20trying%20to%20do%3F%0A%0A%0A%0AWhat%20happened%20instead%3F%0A%0A%0A%0ABrowser%2FDevice%20info%3A%0A`}
            onClick={() => setIsOpen(false)}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 border-t border-gray-200"
          >
            Contact Support
          </a>
          {morphSession?.isMorphed ? (
            <div className="px-4 py-3 text-sm text-yellow-800 bg-yellow-50 border-t border-gray-200">
              <p className="font-semibold mb-1">Morphed Session Active</p>
              <p className="text-xs">Use the "End Morph Session" button in the yellow banner above to return to your admin account.</p>
            </div>
          ) : (
            <button
              onClick={() => {
                setIsOpen(false);
                logout();
                // Use window.location for immediate navigation (bypass component checks)
                window.location.href = '/';
              }}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Sign out
            </button>
          )}
        </div>
      )}

      {/* Subscription Required Modal */}
      {showSubscriptionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Subscription Required</h3>
            <p className="text-gray-700 mb-6">
              This feature is for subscribed Members only. Subscribe to access your Journal and track your spiritual growth journey.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSubscriptionModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowSubscriptionModal(false);
                  // TODO: Navigate to subscription page when it's ready
                  alert('Subscription feature coming soon!');
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Subscribe Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
