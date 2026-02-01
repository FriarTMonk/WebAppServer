import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getAllParables, getParable, getParablesByCategory } from '@/lib/parable';
import { AuthGuard } from '@/components/AuthGuard';
import { ParableLayout } from '@/components/parables/ParableLayout';
import { ParableContentWrapper } from '@/components/parables/ParableContentWrapper';

interface ParablePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const parables = await getAllParables();

  return parables.map(parable => ({
    slug: parable.slug,
  }));
}

export async function generateMetadata({ params }: ParablePageProps): Promise<Metadata> {
  const { slug } = await params;
  const parable = await getParable(slug);

  if (!parable) {
    return {
      title: 'Parable Not Found',
    };
  }

  return {
    title: `${parable.title} | Parables for Today`,
    description: parable.excerpt,
    openGraph: {
      title: parable.title,
      description: parable.excerpt,
      type: 'article',
    },
  };
}

export default async function ParablePage({ params }: ParablePageProps) {
  const { slug } = await params;
  const parable = await getParable(slug);

  if (!parable) {
    notFound();
  }

  // Get related parables (same category)
  const relatedParables = (await getParablesByCategory(parable.category))
    .filter(p => p.slug !== parable.slug)
    .slice(0, 3);

  return (
    <AuthGuard requireAuth redirectTo="/login">
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
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
                  className="h-10 w-auto sm:h-12"
                />
              </Link>
              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center gap-4">
                <Link
                  href="/parables"
                  className="text-gray-700 hover:text-amber-700 font-medium transition-colors"
                >
                  Parables
                </Link>
                <Link
                  href="/blog"
                  className="text-gray-700 hover:text-amber-700 font-medium transition-colors"
                >
                  Blog
                </Link>
                <Link
                  href="/about"
                  className="text-gray-700 hover:text-amber-700 font-medium transition-colors"
                >
                  About
                </Link>
                <Link
                  href="/home"
                  className="bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700 font-medium transition-colors"
                >
                  Go to Counselor
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Back Button & Breadcrumbs */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <Link
            href="/parables"
            className="inline-flex items-center text-amber-600 hover:text-amber-700 mb-4 font-medium"
          >
            ← Back to Parables
          </Link>
          <nav className="flex text-sm text-gray-600 overflow-x-auto" aria-label="Breadcrumb">
            <Link href="/home" className="hover:text-amber-600 whitespace-nowrap">
              Home
            </Link>
            <span className="mx-2" aria-hidden="true">/</span>
            <Link href="/parables" className="hover:text-amber-600 whitespace-nowrap">
              Parables
            </Link>
            <span className="mx-2" aria-hidden="true">/</span>
            <span className="text-gray-900 truncate" aria-current="page">{parable.title}</span>
          </nav>
        </div>

        <ParableLayout>
          {/* Header */}
          <div className="mb-8 pb-6 border-b border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1 bg-amber-100 text-amber-800 text-sm font-medium rounded-full">
                {parable.category}
              </span>
              <span className="text-gray-500 text-sm">
                {parable.readTime}
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {parable.title}
            </h1>

            <p className="text-xl text-gray-600">
              {parable.excerpt}
            </p>
          </div>

        {/* Parable Content */}
        <ParableContentWrapper slug={parable.slug}>
          <div className="parable-content">
            {parable.mdxContent}
          </div>
        </ParableContentWrapper>

          {/* Related Parables */}
          {relatedParables.length > 0 && (
            <div className="mt-12 pt-8 border-t border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Related Parables
              </h2>
              <div className="grid md:grid-cols-3 gap-4">
                {relatedParables.map(related => (
                  <Link
                    key={related.slug}
                    href={`/parables/${related.slug}`}
                    className="block bg-amber-50 rounded-lg p-4 hover:bg-amber-100 transition-colors"
                  >
                    <h3 className="font-semibold text-gray-900 mb-2">
                      {related.title}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {related.excerpt}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </ParableLayout>
      </div>
    </AuthGuard>
  );
}
