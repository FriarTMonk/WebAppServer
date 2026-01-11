'use client';

import Link from 'next/link';
import { useState } from 'react';
import { PlansMenu } from '../components/PlansMenu';
import { TestimonialsSection } from '../components/TestimonialsSection';

/**
 * Marketing Landing Page
 *
 * Unix Principles Applied:
 * - Single purpose: Explain service and drive signups
 * - Clear and simple: Hero, features, CTA
 * - Minimal design: No distractions, focus on value
 */
export default function LandingPage() {
  const [isContactDropdownOpen, setIsContactDropdownOpen] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  return (
    <>
      {/* Structured Data for SEO - Helps Google understand your service */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ProfessionalService',
            name: 'MyChristianCounselor',
            description: 'Online Christian counseling, biblical counseling, and AI-powered counseling tools available 24/7',
            url: 'https://www.mychristiancounselor.online',
            logo: 'https://www.mychristiancounselor.online/logo.jpg',
            priceRange: '$$',
            areaServed: {
              '@type': 'Country',
              name: 'United States',
            },
            availableLanguage: 'English',
            serviceType: ['Christian Counseling', 'Biblical Counseling', 'AI Counseling', 'Faith-Based Therapy'],
            provider: {
              '@type': 'Organization',
              name: 'MyChristianCounselor',
              url: 'https://www.mychristiancounselor.online',
              description: 'Christian counseling platform with AI-powered biblical guidance tools',
            },
            hasOfferCatalog: {
              '@type': 'OfferCatalog',
              name: 'Counseling Services',
              itemListElement: [
                {
                  '@type': 'Offer',
                  itemOffered: {
                    '@type': 'Service',
                    name: 'Christian Counseling Online',
                    description: 'Scripture-based guidance and biblical counseling available 24/7',
                  },
                },
                {
                  '@type': 'Offer',
                  itemOffered: {
                    '@type': 'Service',
                    name: 'AI Counseling Tools',
                    description: 'AI-powered biblical guidance and counseling support',
                  },
                },
              ],
            },
            offers: {
              '@type': 'Offer',
              description: 'Online Christian counseling with free trial',
              priceCurrency: 'USD',
              availability: 'https://schema.org/InStock',
              url: 'https://www.mychristiancounselor.online/register',
            },
          }),
        }}
      />
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <img
                src="/logo.jpg"
                alt="MyChristianCounselor Online"
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
                <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
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
                  <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Plans</h3>
                  <PlansMenu />
                </div>

                {/* Contact Section */}
                <div className="border-b pb-4">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Contact Us</h3>
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

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h2 className="text-5xl font-extrabold text-gray-900 mb-6">
          Christian Counseling & Biblical Guidance
          <br />
          <span className="text-teal-600">With AI-Powered Counseling Tools</span>
        </h2>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Get compassionate Christian counseling online with AI-powered biblical guidance tools.
          Scripture-based counseling available 24/7 with complete confidentiality.
        </p>
        <div className="flex justify-center gap-4">
          <Link
            href="/register"
            className="bg-teal-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-teal-700 transition-colors shadow-lg"
          >
            Start Free Session
          </Link>
          <Link
            href="/login"
            className="bg-white text-teal-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-50 transition-colors border-2 border-teal-600"
          >
            Sign In
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Online Christian Counseling & Biblical Counseling Services
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-lg shadow-md">
            <div className="text-4xl mb-4">📖</div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              Scripture-Based Biblical Counseling
            </h3>
            <p className="text-gray-600">
              Every response from our AI counseling tools is grounded in Biblical truth and Christian principles.
              Multiple Bible translations available for deeper spiritual study and faith-based guidance.
            </p>
          </div>

          <div className="bg-white p-8 rounded-lg shadow-md">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              AI-Powered Counseling Tools
            </h3>
            <p className="text-gray-600">
              Advanced AI technology provides instant Christian counseling and biblical guidance.
              Get scripture-based answers and faith-based counseling support anytime you need it.
            </p>
          </div>

          <div className="bg-white p-8 rounded-lg shadow-md">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              Private & Confidential Support
            </h3>
            <p className="text-gray-600">
              Your Christian counseling sessions are completely private and confidential.
              Bank-level encryption protects your faith journey and personal information.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
          How It Works
        </h3>
        <div className="space-y-8">
          <div className="flex items-start gap-6">
            <div className="flex-shrink-0 w-12 h-12 bg-teal-600 text-white rounded-full flex items-center justify-center font-bold text-xl">
              1
            </div>
            <div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">Create Your Account</h4>
              <p className="text-gray-600">
                Sign up in seconds with just your email. No credit card required to start.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-6">
            <div className="flex-shrink-0 w-12 h-12 bg-teal-600 text-white rounded-full flex items-center justify-center font-bold text-xl">
              2
            </div>
            <div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">Share What's On Your Heart</h4>
              <p className="text-gray-600">
                Type your questions, concerns, or struggles. There's no topic too difficult.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-6">
            <div className="flex-shrink-0 w-12 h-12 bg-teal-600 text-white rounded-full flex items-center justify-center font-bold text-xl">
              3
            </div>
            <div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">Receive Biblical Wisdom</h4>
              <p className="text-gray-600">
                Get compassionate, scripture-based guidance tailored to your situation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing CTA */}
      <section className="bg-teal-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-3xl font-bold mb-4">
            Ready to Get Started?
          </h3>
          <p className="text-xl mb-8 opacity-90">
            Free trial available. Cancel anytime. No obligations.
          </p>
          <Link
            href="/register"
            className="inline-block bg-white text-teal-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors shadow-lg"
          >
            Start Your Free Session
          </Link>
        </div>
      </section>

      {/* Testimonials Section */}
      <TestimonialsSection />

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Crisis Line */}
          <div className="text-center mb-6 pb-6 border-b border-gray-700">
            <p className="text-sm text-gray-300">
              <span className="font-semibold text-red-400">In Crisis?</span> Call{' '}
              <a href="tel:988" className="text-white hover:text-red-400 font-bold">
                988
              </a>{' '}
              (Suicide & Crisis Lifeline) or{' '}
              <a href="tel:911" className="text-white hover:text-red-400 font-bold">
                911
              </a>
            </p>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <p className="text-sm">
                © 2025 MyChristianCounselor. All rights reserved.
              </p>
            </div>
            <div className="flex gap-6">
              <Link href="/faq" className="text-sm hover:text-white transition-colors">
                FAQ
              </Link>
              <Link href="/legal/privacy" className="text-sm hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link href="/legal/terms" className="text-sm hover:text-white transition-colors">
                Terms of Service
              </Link>
              <Link href="/support/new" className="text-sm hover:text-white transition-colors">
                Support
              </Link>
              <Link href="/sales/new" className="text-sm hover:text-white transition-colors">
                Sales Inquiry
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
    </>
  );
}
