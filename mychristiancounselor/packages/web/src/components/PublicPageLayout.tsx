import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PublicPageLayoutProps {
  children: React.ReactNode;
  breadcrumbs: BreadcrumbItem[];
  className?: string;
}

/**
 * Layout component for public-facing pages (About, FAQ, Legal, etc.)
 * Includes navigation bar and breadcrumbs
 */
export function PublicPageLayout({ children, breadcrumbs, className = '' }: PublicPageLayoutProps) {
  return (
    <div className={`min-h-screen bg-gradient-to-b from-teal-50 to-white ${className}`}>
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <Image
                src="/logo.jpg"
                alt="MyChristianCounselor"
                width={180}
                height={48}
                priority
                className="h-10 w-auto sm:h-12"
              />
            </Link>
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-4">
              <Link
                href="/blog"
                className="text-gray-700 hover:text-teal-700 font-medium transition-colors"
              >
                Blog
              </Link>
              <Link
                href="/about"
                className="text-gray-700 hover:text-teal-700 font-medium transition-colors"
              >
                About
              </Link>
              <Link
                href="/faq"
                className="text-gray-700 hover:text-teal-700 font-medium transition-colors"
              >
                FAQ
              </Link>
              <Link
                href="/login"
                className="text-gray-700 hover:text-teal-700 font-medium transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 font-medium transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Back Button & Breadcrumbs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <Link
          href="/"
          className="inline-flex items-center text-teal-600 hover:text-teal-700 mb-4 font-medium"
        >
          ← Back to Home
        </Link>
        <nav className="flex text-sm text-gray-600 overflow-x-auto" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-teal-600 whitespace-nowrap">
            Home
          </Link>
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              <span className="mx-2" aria-hidden="true">/</span>
              {crumb.href ? (
                <Link href={crumb.href} className="hover:text-teal-600 whitespace-nowrap">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-gray-900 font-semibold truncate" aria-current="page">
                  {crumb.label}
                </span>
              )}
            </React.Fragment>
          ))}
        </nav>
      </div>

      {/* Page Content */}
      {children}
    </div>
  );
}
