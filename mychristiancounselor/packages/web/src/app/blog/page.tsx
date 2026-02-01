import { Metadata } from 'next';
import Link from 'next/link';
import { getAllBlogPosts, getAllCategories } from '../../lib/blog';
import { PublicPageLayout } from '@/components/PublicPageLayout';

export const metadata: Metadata = {
  title: 'Christian Counseling Blog - Biblical Guidance & Mental Health',
  description: 'Read articles on Christian counseling, biblical guidance for mental health, marriage advice, anxiety and depression, and faith-based living.',
  keywords: 'Christian counseling blog, biblical guidance articles, Christian mental health, faith-based therapy, marriage advice, anxiety help, depression support',
  openGraph: {
    title: 'Christian Counseling Blog - Biblical Guidance & Mental Health',
    description: 'Expert articles on Christian counseling, biblical guidance, and faith-based mental health support.',
    url: 'https://www.mychristiancounselor.online/blog',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Christian Counseling Blog - Biblical Guidance & Mental Health',
    description: 'Expert articles on Christian counseling, biblical guidance, and faith-based mental health support.',
  },
  alternates: {
    canonical: 'https://www.mychristiancounselor.online/blog',
  },
};

export default async function BlogPage() {
  const posts = await getAllBlogPosts();
  const categories = await getAllCategories();

  return (
    <PublicPageLayout breadcrumbs={[{ label: 'Blog' }]}>
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h1 className="text-5xl font-extrabold text-gray-900 mb-6">
          Christian Counseling Blog
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Biblical guidance for mental health, relationships, and faith-based living. Discover scripture-based wisdom for life's challenges.
        </p>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="flex flex-wrap justify-center gap-3">
          {categories.map((category) => (
            <span
              key={category}
              className="px-4 py-2 bg-teal-100 text-teal-800 rounded-full text-sm font-medium"
            >
              {category}
            </span>
          ))}
        </div>
      </section>

      {/* Blog Posts Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map((post) => (
            <article
              key={post.slug}
              className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
            >
              {/* Category Badge */}
              <div className="px-6 pt-6 pb-2">
                <span className="inline-block px-3 py-1 bg-teal-100 text-teal-800 text-xs font-semibold rounded-full">
                  {post.category}
                </span>
              </div>

              {/* Content */}
              <div className="px-6 pb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-3 hover:text-teal-600 transition-colors">
                  <Link href={`/blog/${post.slug}`}>
                    {post.title}
                  </Link>
                </h2>

                <p className="text-gray-600 mb-4 line-clamp-3">
                  {post.excerpt}
                </p>

                {/* Meta Info */}
                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <span>{post.readTime}</span>
                  <time dateTime={post.publishedDate}>
                    {new Date(post.publishedDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </time>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {post.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                {/* Read More Link */}
                <Link
                  href={`/blog/${post.slug}`}
                  className="inline-flex items-center text-teal-600 font-semibold hover:text-teal-700 transition-colors"
                >
                  Read More
                  <svg
                    className="w-4 h-4 ml-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Newsletter Signup CTA */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="bg-teal-600 rounded-lg shadow-xl p-8 md:p-12 text-white text-center">
          <h2 className="text-3xl font-bold mb-4">
            Get Biblical Guidance Delivered
          </h2>
          <p className="text-lg text-teal-50 mb-8">
            Join thousands receiving weekly Christian counseling insights and scripture-based mental health tips.
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
    </PublicPageLayout>
  );
}
