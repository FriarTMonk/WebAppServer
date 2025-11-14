'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

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
            <Link
              href="/"
              className="text-sm hover:underline"
            >
              Back to App
            </Link>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar Navigation */}
        <aside className="w-64 bg-blue-900 text-white min-h-[calc(100vh-4rem)]">
          <nav className="p-4">
            <ul className="space-y-2">
              <li>
                <Link
                  href="/admin"
                  className={`block px-4 py-2 rounded transition-colors ${isActive('/admin')}`}
                >
                  Overview
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/organizations"
                  className={`block px-4 py-2 rounded transition-colors ${isActive('/admin/organizations')}`}
                >
                  Organizations
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/users"
                  className={`block px-4 py-2 rounded transition-colors ${isActive('/admin/users')}`}
                >
                  Users
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/audit-log"
                  className={`block px-4 py-2 rounded transition-colors ${isActive('/admin/audit-log')}`}
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
