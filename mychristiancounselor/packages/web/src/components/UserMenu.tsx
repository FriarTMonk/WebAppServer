'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTour } from '../contexts/TourContext';
import { useRouter, usePathname } from 'next/navigation';
import { apiGet } from '../lib/api';
import { getTourForPage, getPageName } from '../config/tours';
import { useUserPermissions } from '../hooks/useUserPermissions';
import { ResourcesMenuSection } from './shared/ResourcesMenuSection';
import { MenuButton } from './shared/MenuButton';

export function UserMenu() {
  const { user, logout, isAuthenticated, morphSession } = useAuth();
  const { startTour } = useTour();
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isSalesRep, setIsSalesRep] = useState(false);
  const [hasJournalAccess, setHasJournalAccess] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const permissions = useUserPermissions();

  useEffect(() => {
    if (isAuthenticated && user) {
      // Check if user is Sales Rep (not moved to hook yet)
      apiGet('/admin/health-check')
        .then(res => {
          if (res.ok) {
            return res.json();
          }
          throw new Error('Not a platform admin or sales rep');
        })
        .then(data => {
          setIsSalesRep(data.isSalesRep === true);
        })
        .catch(() => {
          setIsSalesRep(false);
        });

      // Check journal access: user has access if they have an active subscription OR are part of an organization
      apiGet('/profile/organizations')
        .then(res => {
          if (res.ok) {
            res.json().then(orgs => {
              const hasOrgs = Array.isArray(orgs) && orgs.length > 0;
              const hasActiveSubscription = user?.subscriptionStatus === 'active';
              const hasAccess = hasActiveSubscription || hasOrgs;
              setHasJournalAccess(hasAccess);
            });
          } else {
            const hasActiveSubscription = user?.subscriptionStatus === 'active';
            setHasJournalAccess(hasActiveSubscription);
          }
        })
        .catch(() => {
          const hasActiveSubscription = user?.subscriptionStatus === 'active';
          setHasJournalAccess(hasActiveSubscription);
        });
    } else {
      setIsSalesRep(false);
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
          <MenuButton onClick={() => { setIsOpen(false); router.push('/profile'); }}>
            Profile
          </MenuButton>
          <MenuButton
            onClick={() => {
              setIsOpen(false);
              if (hasJournalAccess) {
                router.push('/history');
              } else {
                setShowSubscriptionModal(true);
              }
            }}
            disabled={!hasJournalAccess}
            variant={hasJournalAccess ? 'default' : 'disabled'}
          >
            Journal
          </MenuButton>
          <ResourcesMenuSection
            onNavigate={() => setIsOpen(false)}
            hasAccess={hasJournalAccess}
          />
          {permissions.isCounselor && (
            <MenuButton onClick={() => { setIsOpen(false); router.push('/counsel'); }}>
              Counselor
            </MenuButton>
          )}
          {isSalesRep && (
            <MenuButton onClick={() => { setIsOpen(false); router.push('/admin/sales'); }}>
              Sales Queue
            </MenuButton>
          )}
          {permissions.isOrgAdmin && !permissions.isPlatformAdmin && (
            <MenuButton onClick={() => { setIsOpen(false); router.push('/org-admin'); }}>
              Organization Admin
            </MenuButton>
          )}
          {permissions.isPlatformAdmin && (
            <MenuButton
              onClick={() => { setIsOpen(false); router.push('/admin'); }}
              variant="highlighted"
              className="border-t border-gray-200"
            >
              Admin
            </MenuButton>
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
            <MenuButton
              onClick={() => {
                setIsOpen(false);
                logout();
                // Use window.location for immediate navigation (bypass component checks)
                window.location.href = '/';
              }}
            >
              Sign out
            </MenuButton>
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
