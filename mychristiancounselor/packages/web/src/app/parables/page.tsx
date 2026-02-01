import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { getAllParables, getAllCategories } from '@/lib/parable';
import { AuthGuard } from '@/components/AuthGuard';

export const metadata: Metadata = {
  title: 'Parables for Today | MyChristianCounselor Online',
  description: 'Modern parables that connect timeless biblical truths to everyday life.',
};

export default async function ParablesPage() {
  const parables = await getAllParables();
  const categories = await getAllCategories();

  return (
    <AuthGuard requireAuth redirectTo="/login">
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
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
                  className="text-amber-700 font-semibold transition-colors"
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <Link
            href="/home"
            className="inline-flex items-center text-amber-600 hover:text-amber-700 mb-4 font-medium"
          >
            ← Back to Counselor
          </Link>
          <nav className="flex text-sm text-gray-600 overflow-x-auto" aria-label="Breadcrumb">
            <Link href="/home" className="hover:text-amber-600 whitespace-nowrap">
              Home
            </Link>
            <span className="mx-2" aria-hidden="true">/</span>
            <span className="text-gray-900 font-semibold" aria-current="page">Parables</span>
          </nav>
        </div>

        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white py-12 mt-8">
          <div className="max-w-7xl mx-auto px-4">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Parables for Today
            </h1>
            <p className="text-xl text-amber-100 max-w-3xl">
              Modern stories that connect timeless biblical truths to everyday life.
              Discover wisdom for your journey through relatable narratives.
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 py-12">
          {/* Category Filter */}
          {categories.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-700 mb-3">
                Browse by Category
              </h2>
              <div className="flex flex-wrap gap-2">
                <button className="px-4 py-2 bg-amber-600 text-white rounded-full hover:bg-amber-700 transition-colors">
                  All
                </button>
                {categories.map(category => (
                  <button
                    key={category}
                    className="px-4 py-2 bg-white text-gray-700 rounded-full border border-gray-300 hover:border-amber-600 hover:text-amber-600 transition-colors"
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Parables Grid */}
          {parables.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">
                No parables available yet. Check back soon!
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {parables.map(parable => (
                <Link
                  key={parable.slug}
                  href={`/parables/${parable.slug}`}
                  className="block bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow p-6 border-l-4 border-amber-600"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-amber-600 font-medium">
                      {parable.category}
                    </span>
                    <span className="text-sm text-gray-500">
                      {parable.readTime}
                    </span>
                  </div>

                  <h2 className="text-xl font-bold text-gray-900 mb-3">
                    {parable.title}
                  </h2>

                  <p className="text-gray-700 mb-4 line-clamp-3">
                    {parable.excerpt}
                  </p>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-purple-600 font-medium">
                      {parable.scriptureReference}
                    </span>
                    <span className="text-amber-600 hover:text-amber-700 font-medium">
                      Read More →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
