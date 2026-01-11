'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { TourButton } from './TourButton';
import { buildLinkWithTrail, parseTrail } from '@/lib/navigation-utils';

interface OrgAdminLayoutProps {
  children: React.ReactNode;
  organizationName?: string;
}

function OrgAdminLayoutContent({ children, organizationName }: OrgAdminLayoutProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const trailParam = searchParams.get('trail');
  const trail = parseTrail(trailParam);

  const isActive = (path: string) => {
    return pathname === path ? 'bg-green-700' : 'hover:bg-green-600';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-green-800 text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Organization Administration</h1>
              {organizationName && (
                <p className="text-sm text-green-200 mt-1">{organizationName}</p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <TourButton />
              <Link
                href={buildLinkWithTrail('/home', pathname, trail)}
                className="text-sm hover:underline"
              >
                Back to App
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar Navigation */}
        <aside className="w-64 bg-green-900 text-white min-h-[calc(100vh-4rem)]">
          <nav className="p-4">
            <ul className="space-y-2">
              <li>
                <Link
                  href={buildLinkWithTrail('/org-admin', pathname, trail)}
                  className={`block px-4 py-2 rounded transition-colors ${isActive('/org-admin')}`}
                >
                  Overview
                </Link>
              </li>
              <li>
                <Link
                  href={buildLinkWithTrail('/org-admin/members', pathname, trail)}
                  className={`block px-4 py-2 rounded transition-colors ${isActive('/org-admin/members')}`}
                >
                  Members
                </Link>
              </li>
              <li>
                <Link
                  href={buildLinkWithTrail('/org-admin/counselor-assignments', pathname, trail)}
                  className={`block px-4 py-2 rounded transition-colors ${isActive('/org-admin/counselor-assignments')}`}
                >
                  Counselor Assignments
                </Link>
              </li>
              <li>
                <Link
                  href={buildLinkWithTrail('/org-admin/audit-log', pathname, trail)}
                  className={`block px-4 py-2 rounded transition-colors ${isActive('/org-admin/audit-log')}`}
                >
                  Audit Log
                </Link>
              </li>

              {/* Resources Section */}
              <li className="mt-6">
                <div className="px-4 py-2 text-xs font-semibold text-green-300 uppercase tracking-wider">
                  Resources
                </div>
                <ul className="mt-2 space-y-1" aria-label="Resources navigation">
                  <li>
                    <Link
                      href={buildLinkWithTrail('/org-admin/resources/books', pathname, trail)}
                      className={`block px-4 py-2 rounded transition-colors ${isActive('/org-admin/resources/books')}`}
                    >
                      Books
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={buildLinkWithTrail('/resources/books/new', pathname, trail)}
                      className={`block px-4 py-2 rounded transition-colors ${isActive('/resources/books/new')}`}
                    >
                      Add New Book
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={buildLinkWithTrail('/org-admin/resources/books/pending', pathname, trail)}
                      className={`block px-4 py-2 rounded transition-colors ${isActive('/org-admin/resources/books/pending')}`}
                    >
                      Pending Evaluations
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={buildLinkWithTrail('/org-admin/resources/organizations', pathname, trail)}
                      className={`block px-4 py-2 rounded transition-colors ${isActive('/org-admin/resources/organizations')}`}
                    >
                      Organizations
                    </Link>
                  </li>
                </ul>
              </li>

              {/* Settings Section */}
              <li className="mt-6">
                <div className="px-4 py-2 text-xs font-semibold text-green-300 uppercase tracking-wider">
                  Settings
                </div>
                <ul className="mt-2 space-y-1" aria-label="Settings navigation">
                  <li>
                    <Link
                      href={buildLinkWithTrail('/org-admin/settings/book-access', pathname, trail)}
                      className={`block px-4 py-2 rounded transition-colors ${isActive('/org-admin/settings/book-access')}`}
                    >
                      Book Access
                    </Link>
                  </li>
                </ul>
              </li>
            </ul>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

/**
 * Organization Administration Layout
 *
 * Wraps organization admin pages with header, sidebar navigation, and trail-based breadcrumb support.
 */
export function OrgAdminLayout(props: OrgAdminLayoutProps) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50">
        <div className="bg-green-800 text-white shadow-lg">
          <div className="container mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold">Organization Administration</h1>
          </div>
        </div>
      </div>
    }>
      <OrgAdminLayoutContent {...props} />
    </Suspense>
  );
}
