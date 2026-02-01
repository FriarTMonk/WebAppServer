'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { PlansMenu } from './PlansMenu';

export function LandingPageNavigation() {
  const [isContactDropdownOpen, setIsContactDropdownOpen] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Image
              src="/logo.jpg"
              alt="MyChristianCounselor Online"
              width={180}
              height={48}
              priority
              className="h-12 w-auto"
            />
          </div>

          {/* Desktop Navigation - Hidden on Mobile */}
          <div className="hidden lg:flex items-center gap-4">
            {/* Plans Dropdown */}
            <PlansMenu />

            {/* Contact Us Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsContactDropdownOpen(!isContactDropdownOpen)}
                className="text-gray-700 hover:text-teal-700 font-medium transition-colors flex items-center gap-1"
              >
                Contact Us
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isContactDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                  <a
                    href="mailto:sales@mychristiancounselor.online?subject=Sales%20Inquiry"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setIsContactDropdownOpen(false)}
                  >
                    Sales Inquiry
                  </a>
                  <a
                    href="mailto:support@mychristiancounselor.online?subject=Support%20Request"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setIsContactDropdownOpen(false)}
                  >
                    Support
                  </a>
                </div>
              )}
            </div>
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

          {/* Hamburger Menu Button - Mobile Only */}
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="lg:hidden p-2 text-gray-700 hover:bg-gray-100 rounded-md"
            aria-label="Menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu Panel */}
      {showMobileMenu && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-50"
          onClick={() => setShowMobileMenu(false)}
        >
          <div
            className="absolute right-0 top-0 bottom-0 w-80 bg-white shadow-xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <div className="flex justify-between items-center p-4 border-b">
              <div className="text-lg font-semibold text-gray-900">Menu</div>
              <button
                onClick={() => setShowMobileMenu(false)}
                className="p-2 text-gray-500 hover:text-gray-700"
                aria-label="Close menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Mobile Menu Content */}
            <div className="p-4 space-y-4">
              {/* Plans Section */}
              <div className="border-b pb-4">
                <div className="text-sm font-semibold text-gray-500 uppercase mb-2">Plans</div>
                <PlansMenu />
              </div>

              {/* Contact Section */}
              <div className="border-b pb-4">
                <div className="text-sm font-semibold text-gray-500 uppercase mb-2">Contact Us</div>
                <a
                  href="mailto:sales@mychristiancounselor.online?subject=Sales%20Inquiry"
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
                  onClick={() => setShowMobileMenu(false)}
                >
                  Sales Inquiry
                </a>
                <a
                  href="mailto:support@mychristiancounselor.online?subject=Support%20Request"
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
                  onClick={() => setShowMobileMenu(false)}
                >
                  Support
                </a>
              </div>

              {/* Auth Links */}
              <div className="space-y-2">
                <Link
                  href="/login"
                  className="block w-full text-center text-gray-700 hover:text-teal-700 font-medium py-2 px-4 border border-gray-300 rounded-lg transition-colors"
                  onClick={() => setShowMobileMenu(false)}
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="block w-full text-center bg-teal-600 text-white py-2 px-4 rounded-lg hover:bg-teal-700 font-medium transition-colors"
                  onClick={() => setShowMobileMenu(false)}
                >
                  Get Started
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
