import Link from 'next/link';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white shadow-sm rounded-lg p-8">
        <div className="mb-8">
          <Link
            href="/"
            className="text-teal-600 hover:text-teal-700 text-sm font-medium"
          >
            ← Back to Home
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-600 mb-8">Last Updated: December 1, 2025</p>

        <div className="prose prose-teal max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
              1. Information We Collect
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We collect information that you provide directly to us:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>
                <strong>Account Information:</strong> Name, email address, password
              </li>
              <li>
                <strong>Counseling Sessions:</strong> Conversation history, session notes,
                topics discussed
              </li>
              <li>
                <strong>Payment Information:</strong> Processed securely through Stripe (we
                do not store credit card details)
              </li>
              <li>
                <strong>Usage Data:</strong> Log data, device information, IP address
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
              2. How We Use Your Information
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We use the information we collect to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Provide and improve our counseling services</li>
              <li>Process your subscription payments</li>
              <li>Send you service-related communications</li>
              <li>Respond to your support requests</li>
              <li>Monitor and analyze usage patterns</li>
              <li>Detect and prevent fraud or security issues</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
              3. Information Sharing
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We do NOT sell your personal information. We may share information with:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>
                <strong>Service Providers:</strong> AI providers (Anthropic/OpenAI), payment
                processor (Stripe), email service (Postmark)
              </li>
              <li>
                <strong>Legal Requirements:</strong> When required by law or to protect our
                rights
              </li>
              <li>
                <strong>Organization Counselors:</strong> If you're part of an organization,
                assigned counselors may access your session history
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
              4. Data Retention
            </h2>
            <p className="text-gray-700 leading-relaxed">
              We retain your personal information for as long as your account is active or as
              needed to provide you services. You may request deletion of your account and
              data at any time through the settings page.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
              5. Data Security
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We implement security measures to protect your information:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Encryption in transit (HTTPS/TLS)</li>
              <li>Encrypted password storage using bcrypt</li>
              <li>Secure authentication with JWT tokens</li>
              <li>Regular security audits and updates</li>
              <li>Rate limiting to prevent abuse</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              However, no system is completely secure. We cannot guarantee absolute security
              of your information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
              6. Your Rights
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Export your conversation history</li>
              <li>Opt-out of marketing communications</li>
              <li>Withdraw consent for data processing</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
              7. Cookies and Tracking
            </h2>
            <p className="text-gray-700 leading-relaxed">
              We use essential cookies for authentication and session management. We do not
              use third-party tracking cookies or sell your data to advertisers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
              8. Children's Privacy
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Our Service is not intended for users under 13 years of age. We do not
              knowingly collect personal information from children under 13.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
              9. International Data Transfers
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Your information may be transferred to and processed in countries other than
              your country of residence. By using the Service, you consent to such transfers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
              10. Changes to This Policy
            </h2>
            <p className="text-gray-700 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of
              significant changes by email or through the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
              11. Contact Us
            </h2>
            <p className="text-gray-700 leading-relaxed">
              For questions about this Privacy Policy or to exercise your privacy rights,
              please contact us through our support system.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            By using MyChristianCounselor, you acknowledge that you have read and understood
            this Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
