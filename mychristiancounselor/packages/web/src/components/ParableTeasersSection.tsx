'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

interface ParableTeasersSectionProps {
  parables: Array<{
    slug: string;
    title: string;
    category: string;
    excerpt: string;
  }>;
}

export function ParableTeasersSection({ parables }: ParableTeasersSectionProps) {
  const { isAuthenticated } = useAuth();

  // Helper function to truncate text to first 50-100 words
  const truncateToWords = (text: string, maxWords: number = 75): string => {
    const words = text.split(/\s+/);
    if (words.length <= maxWords) return text;
    return words.slice(0, maxWords).join(' ') + '...';
  };

  if (!parables || parables.length === 0) {
    return null;
  }

  return (
    <section className="bg-gradient-to-r from-amber-50 to-orange-50 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h3 className="text-4xl font-bold text-gray-900 mb-4">
            Teasers from 'Parables for Today'
          </h3>
          <p className="text-xl text-gray-600">
            {isAuthenticated ? 'Click to read the full parable' : 'Login to read the full parables'}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {parables.map((parable) => (
            <div
              key={parable.slug}
              className="bg-white p-8 rounded-lg shadow-md hover:shadow-xl transition-shadow border-l-4 border-amber-600"
            >
              {/* Category Badge */}
              <span className="inline-block px-3 py-1 bg-amber-100 text-amber-800 text-sm font-medium rounded-full mb-4">
                {parable.category}
              </span>

              {/* Title */}
              <h4 className="text-2xl font-bold text-gray-900 mb-4">
                {parable.title}
              </h4>

              {/* Teaser (first 50-100 words) */}
              <p className="text-gray-700 mb-6 leading-relaxed">
                {truncateToWords(parable.excerpt, 75)}
              </p>

              {/* CTA Button */}
              {isAuthenticated ? (
                <Link
                  href={`/parables/${parable.slug}`}
                  className="inline-block bg-amber-600 text-white px-6 py-3 rounded-lg hover:bg-amber-700 transition-colors font-medium"
                >
                  Read Full Parable →
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="inline-block bg-amber-600 text-white px-6 py-3 rounded-lg hover:bg-amber-700 transition-colors font-medium"
                >
                  Login to Read →
                </Link>
              )}
            </div>
          ))}
        </div>

        {/* View All Link */}
        {isAuthenticated && (
          <div className="text-center mt-12">
            <Link
              href="/parables"
              className="inline-block text-amber-600 hover:text-amber-700 font-semibold text-lg"
            >
              View All Parables →
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
