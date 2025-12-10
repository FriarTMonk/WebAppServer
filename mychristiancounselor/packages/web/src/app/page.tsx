'use client';

import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Marketing Landing Page
 *
 * Unix Principles Applied:
 * - Single purpose: Explain service and drive signups
 * - Clear and simple: Hero, features, CTA
 * - Minimal design: No distractions, focus on value
 */
export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  // Redirect authenticated users to conversation view
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/home');
    }
  }, [isAuthenticated, router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-teal-700">MyChristianCounselor</h1>
            </div>
            <div className="flex items-center gap-4">
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

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h2 className="text-5xl font-extrabold text-gray-900 mb-6">
          Biblical Counseling,
          <br />
          <span className="text-teal-600">Anytime You Need It</span>
        </h2>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Get compassionate, scripture-based guidance through life's challenges.
          Available 24/7 with complete confidentiality.
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
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-lg shadow-md">
            <div className="text-4xl mb-4">📖</div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              Scripture-Based Guidance
            </h3>
            <p className="text-gray-600">
              Every response is grounded in Biblical truth and Christian principles.
              Multiple translations available for deeper study.
            </p>
          </div>

          <div className="bg-white p-8 rounded-lg shadow-md">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              Private & Confidential
            </h3>
            <p className="text-gray-600">
              Your conversations are completely private. We use bank-level encryption
              and never share your information.
            </p>
          </div>

          <div className="bg-white p-8 rounded-lg shadow-md">
            <div className="text-4xl mb-4">💬</div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              24/7 Availability
            </h3>
            <p className="text-gray-600">
              Get support whenever you need it - day or night. No appointments,
              no waiting rooms, no judgment.
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

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <p className="text-sm">
                © 2025 MyChristianCounselor. All rights reserved.
              </p>
            </div>
            <div className="flex gap-6">
              <Link href="/legal/privacy" className="text-sm hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link href="/legal/terms" className="text-sm hover:text-white transition-colors">
                Terms of Service
              </Link>
              <Link href="/support/new" className="text-sm hover:text-white transition-colors">
                Support
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
