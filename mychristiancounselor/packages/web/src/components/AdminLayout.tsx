'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TourButton } from './TourButton';
import { buildLinkWithReferrer } from '@/lib/navigation-utils';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();

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
                href={buildLinkWithReferrer('/home', pathname)}
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
                  href={buildLinkWithReferrer('/admin', pathname)}
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
                      href={buildLinkWithReferrer('/admin/organizations', pathname)}
                      className={`block px-4 py-2 rounded transition-colors ${isActive('/admin/organizations')}`}
                    >
                      Customers
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={buildLinkWithReferrer('/admin/users', pathname)}
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
                      href={buildLinkWithReferrer('/admin/sales', pathname)}
                      className={`block px-4 py-2 rounded transition-colors ${isActive('/admin/sales')}`}
                    >
                      Sales Queue
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={buildLinkWithReferrer('/marketing', pathname)}
                      className={`block px-4 py-2 rounded transition-colors ${pathname?.startsWith('/marketing') ? 'bg-blue-700' : 'hover:bg-blue-600'}`}
                    >
                      Marketing
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={buildLinkWithReferrer('/admin/support', pathname)}
                      className={`block px-4 py-2 rounded transition-colors ${isActive('/admin/support')}`}
                    >
                      Support
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={buildLinkWithReferrer('/admin/holidays', pathname)}
                      className={`block px-4 py-2 rounded transition-colors ${isActive('/admin/holidays')}`}
                    >
                      Holidays
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
                      href={buildLinkWithReferrer('/admin/audit-log', pathname)}
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
                      href={buildLinkWithReferrer('/admin/resources/books', pathname)}
                      className={`block px-4 py-2 rounded transition-colors ${isActive('/admin/resources/books')}`}
                    >
                      All Books
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={buildLinkWithReferrer('/admin/resources/evaluation', pathname)}
                      className={`block px-4 py-2 rounded transition-colors ${isActive('/admin/resources/evaluation')}`}
                    >
                      Evaluation Management
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={buildLinkWithReferrer('/admin/resources/organizations', pathname)}
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
