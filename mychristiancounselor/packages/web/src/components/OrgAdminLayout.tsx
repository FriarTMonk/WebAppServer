'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TourButton } from './TourButton';

interface OrgAdminLayoutProps {
  children: React.ReactNode;
  organizationName?: string;
}

export function OrgAdminLayout({ children, organizationName }: OrgAdminLayoutProps) {
  const pathname = usePathname();

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
                href="/home"
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
                  href="/org-admin"
                  className={`block px-4 py-2 rounded transition-colors ${isActive('/org-admin')}`}
                >
                  Overview
                </Link>
              </li>
              <li>
                <Link
                  href="/org-admin/members"
                  className={`block px-4 py-2 rounded transition-colors ${isActive('/org-admin/members')}`}
                >
                  Members
                </Link>
              </li>
              <li>
                <Link
                  href="/org-admin/counselor-assignments"
                  className={`block px-4 py-2 rounded transition-colors ${isActive('/org-admin/counselor-assignments')}`}
                >
                  Counselor Assignments
                </Link>
              </li>
              <li>
                <Link
                  href="/org-admin/audit-log"
                  className={`block px-4 py-2 rounded transition-colors ${isActive('/org-admin/audit-log')}`}
                >
                  Audit Log
                </Link>
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
