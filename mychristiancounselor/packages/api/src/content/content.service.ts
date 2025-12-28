import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  displayOrder: number;
  isPublished: boolean;
}

interface Testimonial {
  id: string;
  content: string;
  authorName: string;
  authorRole: string | null;
  authorImage: string | null;
  isFeatured: boolean;
  isPublished: boolean;
  displayOrder: number;
}

/**
 * Content Service
 *
 * Reads marketing content from JSON files.
 * Files are cached in memory for performance.
 *
 * Unix Principle: Simple file-based content, no database overhead
 */
@Injectable()
export class ContentService {
  private faqsCache: FAQ[] | null = null;
  private testimonialsCache: Testimonial[] | null = null;

  /**
   * Get published FAQs sorted by displayOrder
   */
  getFaqs(): FAQ[] {
    if (!this.faqsCache) {
      // Webpack bundles everything and copies assets to dist/content
      // Use __dirname (points to compiled location) instead of process.cwd() (working directory)
      const faqsPath = join(__dirname, 'content', 'faqs.json');
      const faqsData = readFileSync(faqsPath, 'utf-8');
      const allFaqs: FAQ[] = JSON.parse(faqsData);

      // Filter published, sort by displayOrder
      this.faqsCache = allFaqs
        .filter((faq) => faq.isPublished)
        .sort((a, b) => a.displayOrder - b.displayOrder);
    }

    return this.faqsCache;
  }

  /**
   * Get published testimonials sorted by featured + displayOrder
   */
  getTestimonials(): Testimonial[] {
    if (!this.testimonialsCache) {
      // Webpack bundles everything and copies assets to dist/content
      // Use __dirname (points to compiled location) instead of process.cwd() (working directory)
      const testimonialsPath = join(__dirname, 'content', 'testimonials.json');
      const testimonialsData = readFileSync(testimonialsPath, 'utf-8');
      const allTestimonials: Testimonial[] = JSON.parse(testimonialsData);

      // Filter published, sort by featured first, then displayOrder
      this.testimonialsCache = allTestimonials
        .filter((testimonial) => testimonial.isPublished)
        .sort((a, b) => {
          // Featured first
          if (a.isFeatured && !b.isFeatured) return -1;
          if (!a.isFeatured && b.isFeatured) return 1;
          // Then by displayOrder
          return a.displayOrder - b.displayOrder;
        });
    }

    return this.testimonialsCache;
  }

  /**
   * Clear cache (useful for development/testing)
   */
  clearCache(): void {
    this.faqsCache = null;
    this.testimonialsCache = null;
  }
}
