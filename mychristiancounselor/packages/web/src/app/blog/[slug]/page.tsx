import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getBlogPost, getAllBlogPosts } from '../../../lib/blog';
import { mdxComponents } from '../../../components/blog/mdx-components';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);

  if (!post) {
    return {
      title: 'Post Not Found',
    };
  }

  return {
    title: `${post.title} | MyChristianCounselor Blog`,
    description: post.excerpt,
    keywords: post.tags.join(', '),
    authors: [{ name: post.author }],
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.publishedDate,
      modifiedTime: post.updatedDate || post.publishedDate,
      authors: [post.author],
      url: `https://www.mychristiancounselor.online/blog/${post.slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
    },
    alternates: {
      canonical: `https://www.mychristiancounselor.online/blog/${post.slug}`,
    },
  };
}

export async function generateStaticParams() {
  const posts = await getAllBlogPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getBlogPost(slug);

  if (!post) {
    notFound();
  }

  // Get related posts (same category, exclude current)
  const allPosts = await getAllBlogPosts();
  const relatedPosts = allPosts
    .filter((p) => p.category === post.category && p.slug !== post.slug)
    .slice(0, 2);

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

      {/* Breadcrumbs */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <nav className="flex text-sm text-gray-600">
          <Link href="/" className="hover:text-teal-600">
            Home
          </Link>
          <span className="mx-2">/</span>
          <Link href="/blog" className="hover:text-teal-600">
            Blog
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900">{post.title}</span>
        </nav>
      </div>

      {/* Article Header */}
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Category Badge */}
        <div className="mb-4">
          <span className="inline-block px-4 py-2 bg-teal-100 text-teal-800 text-sm font-semibold rounded-full">
            {post.category}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6">
          {post.title}
        </h1>

        {/* Meta Info */}
        <div className="flex items-center justify-between text-gray-600 mb-8 pb-8 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div>
              <p className="font-medium text-gray-900">{post.author}</p>
              <time dateTime={post.publishedDate} className="text-sm">
                {new Date(post.publishedDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </time>
            </div>
          </div>
          <span className="text-sm text-gray-500">{post.readTime}</span>
        </div>

        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'BlogPosting',
              headline: post.title,
              description: post.excerpt,
              author: {
                '@type': 'Organization',
                name: post.author,
              },
              datePublished: post.publishedDate,
              dateModified: post.updatedDate || post.publishedDate,
              keywords: post.tags.join(', '),
              articleSection: post.category,
              url: `https://www.mychristiancounselor.online/blog/${post.slug}`,
              publisher: {
                '@type': 'Organization',
                name: 'MyChristianCounselor',
                logo: {
                  '@type': 'ImageObject',
                  url: 'https://www.mychristiancounselor.online/logo.jpg',
                },
              },
            }),
          }}
        />

        {/* Article Content */}
        <div className="prose prose-lg max-w-none">
          {post.mdxContent}
        </div>

        {/* Tags */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">TAGS:</h3>
          <div className="flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full hover:bg-gray-200 transition-colors"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>

        {/* Share Section */}
        <div className="mt-8 py-8 border-y border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">SHARE THIS ARTICLE:</h3>
          <div className="flex gap-4">
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(`https://www.mychristiancounselor.online/blog/${post.slug}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-blue-500 transition-colors"
            >
              <span className="sr-only">Share on Twitter</span>
              Twitter
            </a>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`https://www.mychristiancounselor.online/blog/${post.slug}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-blue-700 transition-colors"
            >
              <span className="sr-only">Share on Facebook</span>
              Facebook
            </a>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-12 bg-teal-600 rounded-lg shadow-xl p-8 text-white text-center">
          <h3 className="text-2xl font-bold mb-4">
            Need Personal Guidance?
          </h3>
          <p className="text-lg text-teal-50 mb-6">
            Get confidential, scripture-based counseling tailored to your situation—available 24/7.
          </p>
          <Link
            href="/register"
            className="inline-block bg-white text-teal-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors shadow-lg"
          >
            Start Free Session
          </Link>
        </div>
      </article>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Related Articles</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {relatedPosts.map((relatedPost) => (
              <article
                key={relatedPost.slug}
                className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
              >
                <div className="p-6">
                  <span className="inline-block px-3 py-1 bg-teal-100 text-teal-800 text-xs font-semibold rounded-full mb-3">
                    {relatedPost.category}
                  </span>
                  <h3 className="text-xl font-bold text-gray-900 mb-3 hover:text-teal-600 transition-colors">
                    <Link href={`/blog/${relatedPost.slug}`}>
                      {relatedPost.title}
                    </Link>
                  </h3>
                  <p className="text-gray-600 mb-4 line-clamp-2">
                    {relatedPost.excerpt}
                  </p>
                  <Link
                    href={`/blog/${relatedPost.slug}`}
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
      )}

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
