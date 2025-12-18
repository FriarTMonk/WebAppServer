'use client';

import React from 'react';
import Link from 'next/link';
import { PlanType } from './PlansMenu';

interface PlanModalProps {
  planType: PlanType;
  onClose: () => void;
}

export function PlanModal({ planType, onClose }: PlanModalProps) {
  const renderContent = () => {
    switch (planType) {
      case 'free':
        return renderFreePlan();
      case 'premium':
        return renderPremiumPlan();
      case 'organization':
        return renderOrganizationPlan();
      case 'comparison':
        return renderComparisonTable();
      default:
        return null;
    }
  };

  const renderFreePlan = () => (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Registered User - Free Tier</h2>
      <div className="mb-4">
        <span className="inline-block px-4 py-2 bg-blue-100 text-blue-900 text-lg font-bold rounded-lg">
          FREE
        </span>
      </div>
      <div className="prose max-w-none">
        <p className="text-gray-700 leading-relaxed">
          Start with a generous 21-day trial featuring 6 daily logins for 3 hours of access per day.
          After your trial, continue with 3 daily logins (90 minutes) on our free tier. Receive biblical
          guidance through AI-powered conversations, complete with scripture references in your preferred
          translation, crisis support resources, and grief counseling assistance. Perfect for exploring
          the platform and occasional spiritual guidance.
        </p>

        <div className="mt-6 bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">What's Included:</h3>
          <ul className="space-y-2 text-blue-800">
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>21-day trial with 6 logins/day (3 hours total)</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>3 logins/day after trial (90 minutes total)</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>AI-powered biblical guidance</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>Single Bible translation choice</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>Crisis & grief support resources</span>
            </li>
          </ul>
        </div>

        <div className="mt-6">
          <Link
            href="/register"
            className="block w-full py-3 px-4 bg-blue-600 text-white text-center font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Start Free Trial
          </Link>
        </div>
      </div>
    </div>
  );

  const renderPremiumPlan = () => (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Premium Subscriber - Unlimited Access</h2>
      <div className="mb-4 flex items-baseline gap-3">
        <span className="inline-block px-4 py-2 bg-purple-100 text-purple-900 text-lg font-bold rounded-lg">
          $9.99/month
        </span>
        <span className="text-gray-600">or</span>
        <span className="inline-block px-4 py-2 bg-purple-100 text-purple-900 text-lg font-bold rounded-lg">
          $99.00/year
        </span>
        <span className="text-sm text-green-600 font-medium">(Save 17%)</span>
      </div>
      <div className="prose max-w-none">
        <p className="text-gray-700 leading-relaxed">
          Enjoy unlimited daily logins with no time restrictions. Access your complete conversation history
          anytime, take and save session notes, and export or print your sessions for personal reflection.
          Experience the full platform with priority support and all premium features designed for those seeking
          consistent, in-depth biblical guidance and spiritual growth.
        </p>

        <div className="mt-6 bg-purple-50 p-4 rounded-lg">
          <h3 className="font-semibold text-purple-900 mb-2">What's Included:</h3>
          <ul className="space-y-2 text-purple-800">
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>Unlimited daily logins with no time limits</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>Full conversation history access</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>Session notes and export/print capabilities</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>Active session sharing with others</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>Bible translation comparison mode</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>Priority email support</span>
            </li>
          </ul>
        </div>

        <div className="mt-6">
          <Link
            href="/settings/subscription"
            className="block w-full py-3 px-4 bg-purple-600 text-white text-center font-medium rounded-lg hover:bg-purple-700 transition-colors"
          >
            Upgrade to Premium
          </Link>
        </div>
      </div>
    </div>
  );

  const renderOrganizationPlan = () => (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Organization - Professional Ministry Tools</h2>
      <div className="mb-4">
        <span className="inline-block px-4 py-2 bg-green-100 text-green-900 text-lg font-bold rounded-lg">
          Custom Pricing
        </span>
        <div className="mt-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="text-sm font-semibold text-green-900 mb-3">Annual Billing - Volume Pricing:</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-green-900 border-collapse">
              <thead>
                <tr className="border-b border-green-300">
                  <th className="text-left py-2 px-2 font-semibold">Users</th>
                  <th className="text-right py-2 px-2 font-semibold">Price/User/Year</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-green-200">
                  <td className="py-2 px-2">2-10</td>
                  <td className="text-right py-2 px-2 font-medium">$95</td>
                </tr>
                <tr className="border-b border-green-200">
                  <td className="py-2 px-2">11-100</td>
                  <td className="text-right py-2 px-2 font-medium">$90</td>
                </tr>
                <tr className="border-b border-green-200">
                  <td className="py-2 px-2">101-250</td>
                  <td className="text-right py-2 px-2 font-medium">$85</td>
                </tr>
                <tr className="border-b border-green-200">
                  <td className="py-2 px-2">251-500</td>
                  <td className="text-right py-2 px-2 font-medium">$80</td>
                </tr>
                <tr className="border-b border-green-200">
                  <td className="py-2 px-2">501-750</td>
                  <td className="text-right py-2 px-2 font-medium">$75</td>
                </tr>
                <tr className="border-b border-green-200">
                  <td className="py-2 px-2">751-1000</td>
                  <td className="text-right py-2 px-2 font-medium">$70</td>
                </tr>
                <tr>
                  <td className="py-2 px-2">1000+</td>
                  <td className="text-right py-2 px-2 font-medium">$65</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-green-800 mt-3 text-center font-medium">
            Contact sales for a customized quote
          </p>
        </div>
      </div>
      <div className="prose max-w-none">
        <p className="text-gray-700 leading-relaxed">
          Equip your entire ministry, church staff, or counseling team with premium access. Manage multiple
          users under one account. Every member receives full premium benefits including unlimited access,
          conversation history, and session management. Enable true counseling ministry - members can share
          sessions with designated counselors who can review conversations, add professional notes, and provide
          guided spiritual care. Ideal for churches, ministries, counseling centers, and faith-based
          organizations wanting to provide biblical guidance resources to their community.
        </p>

        <div className="mt-6 bg-green-50 p-4 rounded-lg">
          <h3 className="font-semibold text-green-900 mb-2">What's Included:</h3>
          <ul className="space-y-2 text-green-800">
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>All Premium features for every member</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>Conversation oversight - counselors have passive access to member sessions</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>Counselor notes on shared sessions</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>Counselor dashboard to view member summary</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>Member management and administration</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>Priority email support</span>
            </li>
          </ul>
        </div>

        <div className="mt-6">
          <a
            href="mailto:sales@mychristiancounselor.online"
            className="block w-full py-3 px-4 bg-green-600 text-white text-center font-medium rounded-lg hover:bg-green-700 transition-colors"
          >
            Contact Sales
          </a>
        </div>
      </div>
    </div>
  );

  const renderComparisonTable = () => (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Compare All Plans</h2>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-200 p-3 text-left font-semibold text-gray-900">Feature</th>
              <th className="border border-gray-200 p-3 text-center font-semibold text-blue-900 bg-blue-50">Free</th>
              <th className="border border-gray-200 p-3 text-center font-semibold text-purple-900 bg-purple-50">Premium</th>
              <th className="border border-gray-200 p-3 text-center font-semibold text-green-900 bg-green-50">Organization</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            <tr>
              <td className="border border-gray-200 p-3 font-medium">Trial Period</td>
              <td className="border border-gray-200 p-3 text-center">21 days (6/day)</td>
              <td className="border border-gray-200 p-3 text-center">-</td>
              <td className="border border-gray-200 p-3 text-center">-</td>
            </tr>
            <tr>
              <td className="border border-gray-200 p-3 font-medium">Daily Login Limit</td>
              <td className="border border-gray-200 p-3 text-center">3 logins</td>
              <td className="border border-gray-200 p-3 text-center">Unlimited</td>
              <td className="border border-gray-200 p-3 text-center">Unlimited</td>
            </tr>
            <tr>
              <td className="border border-gray-200 p-3 font-medium">Login Duration</td>
              <td className="border border-gray-200 p-3 text-center">30 min each</td>
              <td className="border border-gray-200 p-3 text-center">No limits</td>
              <td className="border border-gray-200 p-3 text-center">No limits</td>
            </tr>
            <tr>
              <td className="border border-gray-200 p-3 font-medium">Conversation History</td>
              <td className="border border-gray-200 p-3 text-center text-red-500">✗</td>
              <td className="border border-gray-200 p-3 text-center text-green-500">✓</td>
              <td className="border border-gray-200 p-3 text-center text-green-500">✓</td>
            </tr>
            <tr>
              <td className="border border-gray-200 p-3 font-medium">Session Notes</td>
              <td className="border border-gray-200 p-3 text-center text-red-500">✗</td>
              <td className="border border-gray-200 p-3 text-center">✓ (own)</td>
              <td className="border border-gray-200 p-3 text-center">✓ (own + counselor)</td>
            </tr>
            <tr>
              <td className="border border-gray-200 p-3 font-medium">Export/Print Sessions</td>
              <td className="border border-gray-200 p-3 text-center text-red-500">✗</td>
              <td className="border border-gray-200 p-3 text-center text-green-500">✓</td>
              <td className="border border-gray-200 p-3 text-center text-green-500">✓</td>
            </tr>
            <tr>
              <td className="border border-gray-200 p-3 font-medium">Session Sharing</td>
              <td className="border border-gray-200 p-3 text-center text-red-500">✗</td>
              <td className="border border-gray-200 p-3 text-center">✓ (active)</td>
              <td className="border border-gray-200 p-3 text-center">✓ (active)</td>
            </tr>
            <tr>
              <td className="border border-gray-200 p-3 font-medium">Conversation Oversight</td>
              <td className="border border-gray-200 p-3 text-center text-red-500">✗</td>
              <td className="border border-gray-200 p-3 text-center text-red-500">✗</td>
              <td className="border border-gray-200 p-3 text-center">✓ (counselor access)</td>
            </tr>
            <tr>
              <td className="border border-gray-200 p-3 font-medium">Counselor Notes</td>
              <td className="border border-gray-200 p-3 text-center text-red-500">✗</td>
              <td className="border border-gray-200 p-3 text-center text-red-500">✗</td>
              <td className="border border-gray-200 p-3 text-center text-green-500">✓</td>
            </tr>
            <tr>
              <td className="border border-gray-200 p-3 font-medium">Counselor Dashboard</td>
              <td className="border border-gray-200 p-3 text-center text-red-500">✗</td>
              <td className="border border-gray-200 p-3 text-center text-red-500">✗</td>
              <td className="border border-gray-200 p-3 text-center">✓ (view member summary)</td>
            </tr>
            <tr>
              <td className="border border-gray-200 p-3 font-medium">Member Management</td>
              <td className="border border-gray-200 p-3 text-center text-red-500">✗</td>
              <td className="border border-gray-200 p-3 text-center text-red-500">✗</td>
              <td className="border border-gray-200 p-3 text-center text-green-500">✓</td>
            </tr>
            <tr>
              <td className="border border-gray-200 p-3 font-medium">Bible Translation Choice</td>
              <td className="border border-gray-200 p-3 text-center">✓ (single)</td>
              <td className="border border-gray-200 p-3 text-center">✓ (comparison)</td>
              <td className="border border-gray-200 p-3 text-center">✓ (comparison)</td>
            </tr>
            <tr>
              <td className="border border-gray-200 p-3 font-medium">Crisis Support Resources</td>
              <td className="border border-gray-200 p-3 text-center text-green-500">✓</td>
              <td className="border border-gray-200 p-3 text-center text-green-500">✓</td>
              <td className="border border-gray-200 p-3 text-center text-green-500">✓</td>
            </tr>
            <tr>
              <td className="border border-gray-200 p-3 font-medium">Grief Counseling Support</td>
              <td className="border border-gray-200 p-3 text-center text-green-500">✓</td>
              <td className="border border-gray-200 p-3 text-center text-green-500">✓</td>
              <td className="border border-gray-200 p-3 text-center text-green-500">✓</td>
            </tr>
            <tr>
              <td className="border border-gray-200 p-3 font-medium">Support Type</td>
              <td className="border border-gray-200 p-3 text-center">Email</td>
              <td className="border border-gray-200 p-3 text-center">Priority Email</td>
              <td className="border border-gray-200 p-3 text-center">Priority Email</td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="bg-gray-50">
              <td className="border border-gray-200 p-3"></td>
              <td className="border border-gray-200 p-3 text-center">
                <Link
                  href="/register"
                  className="inline-block px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700"
                >
                  Start Free
                </Link>
              </td>
              <td className="border border-gray-200 p-3 text-center">
                <Link
                  href="/settings/subscription"
                  className="inline-block px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded hover:bg-purple-700"
                >
                  Upgrade
                </Link>
              </td>
              <td className="border border-gray-200 p-3 text-center">
                <a
                  href="mailto:sales@mychristiancounselor.online"
                  className="inline-block px-4 py-2 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700"
                >
                  Contact Sales
                </a>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Mobile Tabs View */}
      <div className="block md:hidden">
        <p className="text-center text-gray-600 mb-4">Swipe to compare plans</p>
        <div className="flex overflow-x-auto gap-4 pb-4">
          {/* Free Plan Card */}
          <div className="flex-shrink-0 w-72 bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-bold text-blue-900 mb-3">Free</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Trial Period:</span>
                <span className="font-medium">21 days (6/day)</span>
              </div>
              <div className="flex justify-between">
                <span>Daily Logins:</span>
                <span className="font-medium">3</span>
              </div>
              <div className="flex justify-between">
                <span>Duration:</span>
                <span className="font-medium">30 min each</span>
              </div>
              <div className="flex justify-between">
                <span>History:</span>
                <span className="text-red-500">✗</span>
              </div>
              <div className="flex justify-between">
                <span>Notes:</span>
                <span className="text-red-500">✗</span>
              </div>
              <div className="flex justify-between">
                <span>Export:</span>
                <span className="text-red-500">✗</span>
              </div>
              <div className="flex justify-between">
                <span>Translations:</span>
                <span className="font-medium">Single</span>
              </div>
            </div>
            <Link
              href="/register"
              className="block mt-4 py-2 px-4 bg-blue-600 text-white text-center font-medium rounded hover:bg-blue-700"
            >
              Start Free
            </Link>
          </div>

          {/* Premium Plan Card */}
          <div className="flex-shrink-0 w-72 bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
            <h3 className="text-lg font-bold text-purple-900 mb-3">Premium</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Trial Period:</span>
                <span className="font-medium">-</span>
              </div>
              <div className="flex justify-between">
                <span>Daily Logins:</span>
                <span className="font-medium">Unlimited</span>
              </div>
              <div className="flex justify-between">
                <span>Duration:</span>
                <span className="font-medium">No limits</span>
              </div>
              <div className="flex justify-between">
                <span>History:</span>
                <span className="text-green-500">✓</span>
              </div>
              <div className="flex justify-between">
                <span>Notes:</span>
                <span className="font-medium">✓ (own)</span>
              </div>
              <div className="flex justify-between">
                <span>Export:</span>
                <span className="text-green-500">✓</span>
              </div>
              <div className="flex justify-between">
                <span>Translations:</span>
                <span className="font-medium">Comparison</span>
              </div>
            </div>
            <Link
              href="/settings/subscription"
              className="block mt-4 py-2 px-4 bg-purple-600 text-white text-center font-medium rounded hover:bg-purple-700"
            >
              Upgrade
            </Link>
          </div>

          {/* Organization Plan Card */}
          <div className="flex-shrink-0 w-72 bg-green-50 border-2 border-green-200 rounded-lg p-4">
            <h3 className="text-lg font-bold text-green-900 mb-3">Organization</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Trial Period:</span>
                <span className="font-medium">-</span>
              </div>
              <div className="flex justify-between">
                <span>Daily Logins:</span>
                <span className="font-medium">Unlimited</span>
              </div>
              <div className="flex justify-between">
                <span>Duration:</span>
                <span className="font-medium">No limits</span>
              </div>
              <div className="flex justify-between">
                <span>History:</span>
                <span className="text-green-500">✓</span>
              </div>
              <div className="flex justify-between">
                <span>Notes:</span>
                <span className="font-medium">✓ (+ counselor)</span>
              </div>
              <div className="flex justify-between">
                <span>Export:</span>
                <span className="text-green-500">✓</span>
              </div>
              <div className="flex justify-between">
                <span>Oversight:</span>
                <span className="text-green-500">✓</span>
              </div>
              <div className="flex justify-between">
                <span>Dashboard:</span>
                <span className="text-green-500">✓</span>
              </div>
            </div>
            <a
              href="mailto:sales@mychristiancounselor.online"
              className="block mt-4 py-2 px-4 bg-green-600 text-white text-center font-medium rounded hover:bg-green-700"
            >
              Contact Sales
            </a>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
          <div className="text-sm text-gray-500">Plan Details</div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-light"
          >
            ×
          </button>
        </div>
        <div className="p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
