import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'About Us - Christian Counseling with AI-Powered Biblical Guidance',
  description: 'Learn about MyChristianCounselor, our mission to provide accessible Christian counseling through AI-powered biblical guidance, and our commitment to faith-based mental health support.',
  keywords: 'about Christian counseling, AI counseling mission, biblical guidance platform, faith-based therapy, Christian mental health support',
  openGraph: {
    title: 'About MyChristianCounselor - Faith-Based AI Counseling',
    description: 'Discover how we combine Christian faith with AI technology to provide 24/7 biblical guidance and mental health support.',
    url: 'https://www.mychristiancounselor.online/about',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About MyChristianCounselor - Faith-Based AI Counseling',
    description: 'Discover how we combine Christian faith with AI technology to provide 24/7 biblical guidance and mental health support.',
  },
  alternates: {
    canonical: 'https://www.mychristiancounselor.online/about',
  },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white">
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
                className="h-12 w-auto"
              />
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/blog"
                className="text-gray-700 hover:text-teal-700 font-medium transition-colors"
              >
                Blog
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

      {/* Hero Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h1 className="text-5xl font-extrabold text-gray-900 mb-6">
          About MyChristianCounselor
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Combining faith, technology, and compassion to provide accessible Christian counseling and biblical guidance 24/7.
        </p>
      </section>

      {/* Our Mission */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8 md:p-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Mission</h2>
          <p className="text-lg text-gray-700 mb-4">
            At MyChristianCounselor, we believe that everyone deserves access to compassionate Christian counseling and biblical guidance, regardless of time or location. Our mission is to bridge the gap between traditional faith-based counseling and modern technology, making scripture-based support available whenever you need it.
          </p>
          <p className="text-lg text-gray-700 mb-4">
            We understand that life's challenges don't wait for office hours. Whether you're facing anxiety, relationship struggles, grief, or spiritual questions, our AI-powered Christian counseling tools are here to provide immediate, confidential, and biblically-grounded guidance.
          </p>
          <p className="text-lg text-gray-700">
            We're committed to maintaining the highest standards of Christian ethics, confidentiality, and theological accuracy in every interaction.
          </p>
        </div>
      </section>

      {/* Our Approach */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Our Approach to Christian Counseling
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-teal-50 rounded-lg p-8 border border-teal-200">
            <div className="text-4xl mb-4">📖</div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              Scripture-Centered
            </h3>
            <p className="text-gray-700">
              Every piece of guidance is rooted in Biblical truth. We draw from multiple translations and thousands of years of Christian wisdom to provide relevant, faith-based support for your situation.
            </p>
          </div>

          <div className="bg-blue-50 rounded-lg p-8 border border-blue-200">
            <div className="text-4xl mb-4">🤝</div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              Compassionate Care
            </h3>
            <p className="text-gray-700">
              Our AI counseling tools are designed to listen without judgment, understand your struggles, and respond with empathy and grace—just as Christ would have us treat one another.
            </p>
          </div>

          <div className="bg-purple-50 rounded-lg p-8 border border-purple-200">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              Complete Confidentiality
            </h3>
            <p className="text-gray-700">
              Your faith journey is private. We use bank-level encryption to protect your conversations, and we never share your information with anyone.
            </p>
          </div>
        </div>
      </section>

      {/* Why AI Counseling */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-lg shadow-xl p-8 md:p-12 text-white">
          <h2 className="text-3xl font-bold mb-6">Why AI-Powered Christian Counseling?</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold mb-3">Available 24/7</h3>
              <p className="text-teal-50 mb-6">
                Crisis doesn't wait for business hours. Get biblical guidance and support anytime, day or night, without waiting for appointments.
              </p>

              <h3 className="text-xl font-semibold mb-3">Immediate Response</h3>
              <p className="text-teal-50">
                No more waiting days or weeks for help. Start your healing journey the moment you need support, with instant access to scripture-based guidance.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-3">Affordable Access</h3>
              <p className="text-teal-50 mb-6">
                Quality Christian counseling shouldn't be limited by cost. Our AI-powered platform makes faith-based mental health support accessible to everyone.
              </p>

              <h3 className="text-xl font-semibold mb-3">Private & Judgment-Free</h3>
              <p className="text-teal-50">
                Share your struggles in complete confidentiality. No fear of judgment, no awkward encounters, just honest support rooted in Christian love.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Commitment */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8 md:p-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Commitment to You</h2>
          <ul className="space-y-4">
            <li className="flex items-start">
              <svg className="w-6 h-6 text-teal-600 mt-1 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Theological Accuracy</h3>
                <p className="text-gray-700">We ensure all guidance aligns with orthodox Christian teaching and Biblical truth.</p>
              </div>
            </li>
            <li className="flex items-start">
              <svg className="w-6 h-6 text-teal-600 mt-1 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Continuous Improvement</h3>
                <p className="text-gray-700">We regularly update our AI models and content to provide the best possible support.</p>
              </div>
            </li>
            <li className="flex items-start">
              <svg className="w-6 h-6 text-teal-600 mt-1 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Emergency Support</h3>
                <p className="text-gray-700">While we provide biblical guidance, we recognize when professional crisis intervention is needed and direct you to appropriate resources.</p>
              </div>
            </li>
            <li className="flex items-start">
              <svg className="w-6 h-6 text-teal-600 mt-1 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Community Support</h3>
                <p className="text-gray-700">We believe in the power of Christian community and encourage connection with local churches and support groups.</p>
              </div>
            </li>
          </ul>
        </div>
      </section>

      {/* Call to Action */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="bg-teal-50 rounded-lg p-8 border border-teal-200">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to Experience Faith-Based Support?
          </h2>
          <p className="text-lg text-gray-700 mb-8">
            Join thousands who have found comfort, guidance, and hope through Christian counseling with MyChristianCounselor.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/register"
              className="bg-teal-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-teal-700 transition-colors shadow-lg"
            >
              Start Free Session
            </Link>
            <Link
              href="/faq"
              className="bg-white text-teal-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-50 transition-colors border-2 border-teal-600"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
              <Link href="/about" className="text-sm hover:text-white transition-colors">
                About
              </Link>
              <Link href="/blog" className="text-sm hover:text-white transition-colors">
                Blog
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
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
