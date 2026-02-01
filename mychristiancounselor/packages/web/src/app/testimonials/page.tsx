'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { PublicPageLayout } from '@/components/PublicPageLayout';

interface Testimonial {
  id: string;
  content: string;
  authorName: string;
  authorRole: string;
  authorImage: string | null;
  isFeatured: boolean;
  isPublished: boolean;
  displayOrder: number;
}

export default function TestimonialsPage() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697') + '/v1';
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`${apiUrl}/content/testimonials`, {
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error('Failed to load testimonials');
        }

        const data = await response.json();
        setTestimonials(data);
      } catch (err) {
        console.error('Error fetching testimonials:', err);
        setError('Unable to load testimonials');
      } finally {
        setLoading(false);
      }
    };

    fetchTestimonials();
  }, []);

  return (
    <PublicPageLayout breadcrumbs={[{ label: 'Testimonials' }]} className="bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-700 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-extrabold mb-4">
            What People Are Saying
          </h1>
          <p className="text-xl text-teal-100 max-w-3xl mx-auto">
            Real stories from real people who have found hope, guidance, and faith through MyChristianCounselor.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {loading && (
          <div className="text-center py-12">
            <p className="text-xl text-gray-600">Loading testimonials...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-12">
            <p className="text-xl text-red-600">{error}</p>
          </div>
        )}

        {!loading && !error && testimonials.length === 0 && (
          <div className="text-center py-12">
            <p className="text-xl text-gray-600">No testimonials available yet.</p>
          </div>
        )}

        {!loading && !error && testimonials.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial) => (
              <div
                key={testimonial.id}
                className={`bg-white p-8 rounded-lg shadow-md hover:shadow-xl transition-shadow ${
                  testimonial.isFeatured ? 'ring-2 ring-teal-500' : ''
                }`}
              >
                {/* Quote Icon */}
                <div className="text-teal-600 text-4xl mb-4">&ldquo;</div>

                {/* Testimonial Content */}
                <p className="text-gray-700 mb-6 italic leading-relaxed">
                  {testimonial.content}
                </p>

                {/* Author Info */}
                <div className="flex items-center gap-3">
                  {testimonial.authorImage ? (
                    <Image
                      src={testimonial.authorImage}
                      alt={testimonial.authorName}
                      width={48}
                      height={48}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center">
                      <span className="text-teal-600 font-bold text-lg">
                        {testimonial.authorName.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-gray-900">
                      {testimonial.authorName}
                    </p>
                    <p className="text-sm text-gray-600">
                      {testimonial.authorRole}
                    </p>
                  </div>
                </div>

                {/* Featured Badge */}
                {testimonial.isFeatured && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <span className="inline-block bg-teal-100 text-teal-800 text-xs px-3 py-1 rounded-full font-semibold">
                      Featured
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

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
