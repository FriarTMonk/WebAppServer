import Link from 'next/link';
import { LandingPageNavigation } from '../components/LandingPageNavigation';
import { ParableTeasersWrapper } from '../components/ParableTeasersWrapper';

/**
 * Marketing Landing Page
 *
 * Unix Principles Applied:
 * - Single purpose: Explain service and drive signups
 * - Clear and simple: Hero, features, CTA
 * - Minimal design: No distractions, focus on value
 */
export default function LandingPage() {
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
      <LandingPageNavigation />

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h1 className="text-5xl font-extrabold text-gray-900 mb-6">
          Christian Counseling & Biblical Guidance
          <br />
          <span className="text-teal-600">With AI-Powered Counseling Tools</span>
        </h1>
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
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          How It Works
        </h2>
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
          <h2 className="text-3xl font-bold mb-4">
            Ready to Get Started?
          </h2>
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

      {/* Parable Teasers Section */}
      <ParableTeasersWrapper />

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
            <div className="flex flex-wrap gap-6 justify-center md:justify-end">
              <Link href="/about" className="text-sm hover:text-white transition-colors">
                About
              </Link>
              <Link href="/blog" className="text-sm hover:text-white transition-colors">
                Blog
              </Link>
              <Link href="/testimonials" className="text-sm hover:text-white transition-colors">
                Testimonials
              </Link>
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
