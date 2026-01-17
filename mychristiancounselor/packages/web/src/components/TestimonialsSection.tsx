'use client';

import { useEffect, useState } from 'react';

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

export function TestimonialsSection() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697') + '/v1';
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

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

  if (loading) {
    return (
      <section className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-3xl font-bold text-gray-900 mb-4">
            What People Are Saying
          </h3>
          <p className="text-xl text-gray-600">Loading testimonials...</p>
        </div>
      </section>
    );
  }

  if (error || testimonials.length === 0) {
    return null; // Don't show section if no testimonials
  }

  return (
    <section className="bg-gray-50 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h3 className="text-3xl font-bold text-gray-900 mb-12 text-center">
          What People Are Saying
        </h3>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.id}
              className={`bg-white p-8 rounded-lg shadow-md ${
                testimonial.isFeatured ? 'ring-2 ring-teal-500' : ''
              }`}
            >
              {/* Quote Icon */}
              <div className="text-teal-600 text-4xl mb-4">&ldquo;</div>

              {/* Testimonial Content */}
              <p className="text-gray-700 mb-6 italic">
                {testimonial.content}
              </p>

              {/* Author Info */}
              <div className="flex items-center gap-3">
                {testimonial.authorImage ? (
                  <img
                    src={testimonial.authorImage}
                    alt={testimonial.authorName}
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
      </div>
    </section>
  );
}
