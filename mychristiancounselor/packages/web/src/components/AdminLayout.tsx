'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { TourButton } from './TourButton';
import { buildLinkWithTrail, parseTrail } from '@/lib/navigation-utils';

interface AdminLayoutProps {
  children: React.ReactNode;
}

function AdminLayoutContent({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const trailParam = searchParams.get('trail');
  const trail = parseTrail(trailParam);

  const isActive = (path: string) => {
    return pathname === path ? 'bg-blue-700' : 'hover:bg-blue-600';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-800 text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Platform Administration</h1>
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
        <aside className="w-64 bg-blue-900 text-white min-h-[calc(100vh-4rem)]">
          <nav className="p-4">
            <ul className="space-y-4">
              {/* Overview */}
              <li>
                <Link
                  href={buildLinkWithTrail('/admin', pathname, trail)}
                  className={`block px-4 py-2 rounded transition-colors ${isActive('/admin')}`}
                >
                  Overview
                </Link>
              </li>

              {/* Subscriptions Section */}
              <li className="mt-6">
                <div className="px-4 py-2 text-xs font-semibold text-blue-300 uppercase tracking-wider">
                  Subscriptions
                </div>
                <ul className="mt-2 space-y-1">
                  <li>
                    <Link
                      href={buildLinkWithTrail('/admin/organizations', pathname, trail)}
                      className={`block px-4 py-2 rounded transition-colors ${isActive('/admin/organizations')}`}
                    >
                      Customers
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={buildLinkWithTrail('/admin/users', pathname, trail)}
                      className={`block px-4 py-2 rounded transition-colors ${isActive('/admin/users')}`}
                    >
                      Users
                    </Link>
                  </li>
                </ul>
              </li>

              {/* Operations Section */}
              <li>
                <div className="px-4 py-2 text-xs font-semibold text-blue-300 uppercase tracking-wider">
                  Operations
                </div>
                <ul className="mt-2 space-y-1">
                  <li>
                    <Link
                      href={buildLinkWithTrail('/admin/sales', pathname, trail)}
                      className={`block px-4 py-2 rounded transition-colors ${isActive('/admin/sales')}`}
                    >
                      Sales Queue
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={buildLinkWithTrail('/marketing', pathname, trail)}
                      className={`block px-4 py-2 rounded transition-colors ${pathname?.startsWith('/marketing') ? 'bg-blue-700' : 'hover:bg-blue-600'}`}
                    >
                      Marketing
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={buildLinkWithTrail('/admin/support', pathname, trail)}
                      className={`block px-4 py-2 rounded transition-colors ${isActive('/admin/support')}`}
                    >
                      Support
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={buildLinkWithTrail('/admin/holidays', pathname, trail)}
                      className={`block px-4 py-2 rounded transition-colors ${isActive('/admin/holidays')}`}
                    >
                      Holidays
                    </Link>
                  </li>
                </ul>
              </li>

              {/* Analytics Section */}
              <li>
                <div className="px-4 py-2 text-xs font-semibold text-blue-300 uppercase tracking-wider">
                  Analytics
                </div>
                <ul className="mt-2 space-y-1">
                  <li>
                    <Link
                      href={buildLinkWithTrail('/admin/analytics', pathname, trail)}
                      className={`block px-4 py-2 rounded transition-colors ${isActive('/admin/analytics')}`}
                    >
                      Platform Analytics
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={buildLinkWithTrail('/admin/marketing/analytics', pathname, trail)}
                      className={`block px-4 py-2 rounded transition-colors ${isActive('/admin/marketing/analytics')}`}
                    >
                      Marketing Analytics
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={buildLinkWithTrail('/admin/sales/analytics', pathname, trail)}
                      className={`block px-4 py-2 rounded transition-colors ${isActive('/admin/sales/analytics')}`}
                    >
                      Sales Analytics
                    </Link>
                  </li>
                </ul>
              </li>

              {/* Technical Section */}
              <li>
                <div className="px-4 py-2 text-xs font-semibold text-blue-300 uppercase tracking-wider">
                  Technical
                </div>
                <ul className="mt-2 space-y-1">
                  <li>
                    <Link
                      href={buildLinkWithTrail('/admin/audit-log', pathname, trail)}
                      className={`block px-4 py-2 rounded transition-colors ${isActive('/admin/audit-log')}`}
                    >
                      Audit Log
                    </Link>
                  </li>
                </ul>
              </li>

              {/* Resources Section */}
              <li>
                <div className="px-4 py-2 text-xs font-semibold text-blue-300 uppercase tracking-wider">
                  Resources
                </div>
                <ul className="mt-2 space-y-1">
                  <li>
                    <Link
                      href={buildLinkWithTrail('/admin/resources/books', pathname, trail)}
                      className={`block px-4 py-2 rounded transition-colors ${isActive('/admin/resources/books')}`}
                    >
                      All Books
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={buildLinkWithTrail('/admin/resources/evaluation', pathname, trail)}
                      className={`block px-4 py-2 rounded transition-colors ${isActive('/admin/resources/evaluation')}`}
                    >
                      Evaluation Management
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={buildLinkWithTrail('/admin/resources/organizations', pathname, trail)}
                      className={`block px-4 py-2 rounded transition-colors ${isActive('/admin/resources/organizations')}`}
                    >
                      Organizations
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
 * Platform Administration Layout
 *
 * Wraps platform admin pages with header, sidebar navigation, and trail-based breadcrumb support.
 */
export function AdminLayout(props: AdminLayoutProps) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50">
        <div className="bg-blue-800 text-white shadow-lg">
          <div className="container mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold">Platform Administration</h1>
          </div>
        </div>
      </div>
    }>
      <AdminLayoutContent {...props} />
    </Suspense>
  );
}
