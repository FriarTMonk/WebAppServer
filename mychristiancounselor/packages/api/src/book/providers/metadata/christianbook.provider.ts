import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as cheerio from 'cheerio';
import { IBookMetadataProvider, BookMetadata } from './metadata.provider.interface';

@Injectable()
export class ChristianBookProvider implements IBookMetadataProvider {
  private readonly logger = new Logger(ChristianBookProvider.name);

  constructor(private readonly httpService: HttpService) {}

  supports(identifier: string): boolean {
    // Supports christianbook.com URLs
    return identifier.includes('christianbook.com');
  }

  async lookup(identifier: string): Promise<BookMetadata | null> {
    this.logger.log(`Looking up URL via ChristianBook.com scraper: ${identifier}`);

    try {
      const response = await firstValueFrom(
        this.httpService.get(identifier, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        })
      );

      const $ = cheerio.load(response.data);

      // Extract metadata from the page
      const title = this.extractTitle($);
      const author = this.extractAuthor($);
      const publisher = this.extractPublisher($);
      const publicationYear = this.extractPublicationYear($);
      const description = this.extractDescription($);
      const coverImageUrl = this.extractCoverImage($);
      const isbn = this.extractISBN($);

      if (!title || !author) {
        this.logger.warn('Could not extract required fields (title/author) from ChristianBook.com');
        return null;
      }

      return {
        title,
        author,
        publisher,
        publicationYear,
        description,
        coverImageUrl,
        isbn,
      };
    } catch (error) {
      this.logger.error(`ChristianBook.com scraping failed: ${error.message}`);
      return null;
    }
  }

  private extractTitle($: cheerio.CheerioAPI): string | undefined {
    // Try multiple selectors for title
    const selectors = [
      'h1[itemprop="name"]',
      'h1.CBD-ProductDetailActionable-title',
      'h1.product-title',
      'meta[property="og:title"]',
    ];

    for (const selector of selectors) {
      const value = $(selector).attr('content') || $(selector).first().text().trim();
      if (value) return value;
    }

    return undefined;
  }

  private extractAuthor($: cheerio.CheerioAPI): string | undefined {
    // Try multiple selectors for author
    const selectors = [
      'a[itemprop="author"]',
      '.CBD-ProductDetailActionable-author a',
      '.product-author a',
      'span[itemprop="author"]',
    ];

    for (const selector of selectors) {
      const value = $(selector).first().text().trim();
      if (value) return value;
    }

    return undefined;
  }

  private extractPublisher($: cheerio.CheerioAPI): string | undefined {
    // Try multiple selectors for publisher
    const selectors = [
      'span[itemprop="publisher"]',
      '.publisher',
    ];

    for (const selector of selectors) {
      const value = $(selector).first().text().trim();
      if (value) return value;
    }

    return undefined;
  }

  private extractPublicationYear($: cheerio.CheerioAPI): number | undefined {
    // Try to find publication date
    const selectors = [
      'span[itemprop="datePublished"]',
      '.publication-date',
    ];

    for (const selector of selectors) {
      const value = $(selector).first().text().trim();
      if (value) {
        const year = parseInt(value.substring(0, 4));
        if (year && year > 1000 && year <= new Date().getFullYear() + 1) {
          return year;
        }
      }
    }

    return undefined;
  }

  private extractDescription($: cheerio.CheerioAPI): string | undefined {
    // Try multiple selectors for description
    const selectors = [
      'div[itemprop="description"]',
      '.product-description',
      'meta[property="og:description"]',
      'meta[name="description"]',
    ];

    for (const selector of selectors) {
      const value = $(selector).attr('content') || $(selector).first().text().trim();
      if (value && value.length > 50) return value;
    }

    return undefined;
  }

  private extractCoverImage($: cheerio.CheerioAPI): string | undefined {
    // Try multiple selectors for cover image
    const selectors = [
      'img[itemprop="image"]',
      '.product-image img',
      'meta[property="og:image"]',
      'img.CBD-ProductDetailImage',
    ];

    for (const selector of selectors) {
      let value = $(selector).attr('src') || $(selector).attr('content');
      if (value) {
        // Ensure full URL
        if (value.startsWith('//')) {
          value = 'https:' + value;
        } else if (value.startsWith('/')) {
          value = 'https://christianbook.com' + value;
        }
        return value;
      }
    }

    return undefined;
  }

  private extractISBN($: cheerio.CheerioAPI): string | undefined {
    // Try to find ISBN in various places
    const selectors = [
      'span[itemprop="isbn"]',
      '.isbn',
    ];

    for (const selector of selectors) {
      const value = $(selector).first().text().trim();
      if (value && /^\d{10,13}$/.test(value.replace(/-/g, ''))) {
        return value.replace(/-/g, '');
      }
    }

    // Try to extract from URL (e.g., /9781451673333/)
    const urlMatch = $('.current-url, meta[property="og:url"]')
      .attr('content')
      ?.match(/\/(\d{13})\//);
    if (urlMatch) {
      return urlMatch[1];
    }

    return undefined;
  }
}
