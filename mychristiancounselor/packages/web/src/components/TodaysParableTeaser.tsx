'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

interface Parable {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
}

interface TodaysParableTeaserProps {
  parable?: Parable;
}

export function TodaysParableTeaser({ parable }: TodaysParableTeaserProps) {
  const { isAuthenticated } = useAuth();

  if (!parable) {
    return null;
  }

  // Truncate excerpt to first 150 characters
  const shortExcerpt = parable.excerpt.length > 150
    ? parable.excerpt.substring(0, 150) + '...'
    : parable.excerpt;

  return (
    <section className="bg-gradient-to-r from-amber-50 to-orange-50 py-12 md:py-16">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Teasers from 'Parables for Today'
          </h2>
          <p className="text-gray-600 text-lg">
            {isAuthenticated ? 'Read the full parable' : 'Login to read the full parable'}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 md:p-10 max-w-3xl mx-auto border-l-4 border-amber-600">
          <span className="inline-block px-3 py-1 bg-amber-100 text-amber-800 text-sm font-medium rounded-full mb-4">
            {parable.category}
          </span>

          <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mt-2 mb-4">
            {parable.title}
          </h3>

          <p className="text-gray-700 text-lg mb-6 leading-relaxed">
            {shortExcerpt}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 items-center">
            {isAuthenticated ? (
              <Link
                href={`/parables/${parable.slug}`}
                className="inline-block bg-amber-600 text-white px-8 py-3 rounded-lg hover:bg-amber-700 transition-colors font-medium w-full sm:w-auto text-center"
              >
                Read Full Parable →
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="inline-block bg-amber-600 text-white px-8 py-3 rounded-lg hover:bg-amber-700 transition-colors font-medium w-full sm:w-auto text-center"
                >
                  Login to Read More →
                </Link>
                <Link
                  href="/register"
                  className="inline-block bg-white text-amber-600 px-8 py-3 rounded-lg border-2 border-amber-600 hover:bg-amber-50 transition-colors font-medium w-full sm:w-auto text-center"
                >
                  Create Free Account
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
