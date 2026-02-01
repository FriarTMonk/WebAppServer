import { PublicPageLayout } from '@/components/PublicPageLayout';

export default function TermsOfService() {
  return (
    <PublicPageLayout
      breadcrumbs={[
        { label: 'Legal', href: '/legal/terms' },
        { label: 'Terms of Service' }
      ]}
      className="bg-gray-50"
    >
      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto bg-white shadow-sm rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-600 mb-8">Last Updated: December 1, 2025</p>

        <div className="prose prose-teal max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
              1. Acceptance of Terms
            </h2>
            <p className="text-gray-700 leading-relaxed">
              By accessing or using MyChristianCounselor ("the Service"), you agree to be
              bound by these Terms of Service. If you do not agree to these terms, please
              do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
              2. Description of Service
            </h2>
            <p className="text-gray-700 leading-relaxed">
              MyChristianCounselor provides AI-powered Christian counseling and biblical
              guidance. The Service is designed to offer spiritual support and is not a
              substitute for professional medical, psychological, or psychiatric care.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
              3. User Accounts
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              To access certain features, you must register for an account. You agree to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Provide accurate and complete information</li>
              <li>Maintain the security of your password</li>
              <li>Accept responsibility for all activities under your account</li>
              <li>Notify us immediately of any unauthorized access</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
              4. Subscription and Payment
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Certain features require a paid subscription:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Subscriptions are billed monthly or annually</li>
              <li>Payments are processed securely through Stripe</li>
              <li>You may cancel your subscription at any time</li>
              <li>Refunds are handled on a case-by-case basis</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
              5. Acceptable Use
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              You agree not to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Use the Service for any illegal purpose</li>
              <li>Attempt to gain unauthorized access to the Service</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Distribute malware or malicious code</li>
              <li>Violate any applicable laws or regulations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
              6. Medical Disclaimer
            </h2>
            <p className="text-gray-700 leading-relaxed">
              <strong>IMPORTANT:</strong> MyChristianCounselor is NOT a crisis hotline and
              is NOT a substitute for professional mental health care. If you are
              experiencing a mental health emergency, please contact emergency services
              (911 in the US) or the National Suicide Prevention Lifeline at 988.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
              7. Intellectual Property
            </h2>
            <p className="text-gray-700 leading-relaxed">
              All content, trademarks, and intellectual property on the Service are owned
              by MyChristianCounselor or its licensors. You may not copy, modify, or
              distribute any content without express permission.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
              8. Limitation of Liability
            </h2>
            <p className="text-gray-700 leading-relaxed">
              To the maximum extent permitted by law, MyChristianCounselor shall not be
              liable for any indirect, incidental, special, or consequential damages
              arising from your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
              9. Changes to Terms
            </h2>
            <p className="text-gray-700 leading-relaxed">
              We reserve the right to modify these Terms at any time. Continued use of the
              Service after changes constitutes acceptance of the modified Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
              10. Contact Information
            </h2>
            <p className="text-gray-700 leading-relaxed">
              For questions about these Terms, please contact us through our support system.
            </p>
          </section>
        </div>

          <div className="mt-12 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              By using MyChristianCounselor, you acknowledge that you have read, understood,
              and agree to these Terms of Service.
            </p>
          </div>
        </div>
      </div>
    </PublicPageLayout>
  );
}
