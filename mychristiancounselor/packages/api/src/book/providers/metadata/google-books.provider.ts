import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { IBookMetadataProvider, BookMetadata } from './metadata.provider.interface';

@Injectable()
export class GoogleBooksProvider implements IBookMetadataProvider {
  private readonly logger = new Logger(GoogleBooksProvider.name);

  constructor(private readonly httpService: HttpService) {}

  supports(identifier: string): boolean {
    // Supports ISBN only (10 or 13 digits with optional hyphens)
    return /^(\d{10}|\d{13}|[\d-]{10,17})$/.test(identifier.replace(/-/g, ''));
  }

  async lookup(identifier: string): Promise<BookMetadata | null> {
    const isbn = identifier.replace(/-/g, '');
    this.logger.log(`Looking up ISBN ${isbn} via Google Books`);

    try {
      const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`;
      const response = await firstValueFrom(this.httpService.get(url));

      const items = response.data?.items;
      if (!items || items.length === 0) {
        return null;
      }

      const volumeInfo = items[0].volumeInfo;

      return {
        title: volumeInfo.title,
        author: volumeInfo.authors?.[0] || 'Unknown Author',
        publisher: volumeInfo.publisher,
        publicationYear: volumeInfo.publishedDate
          ? parseInt(volumeInfo.publishedDate.substring(0, 4))
          : undefined,
        description: volumeInfo.description,
        coverImageUrl: volumeInfo.imageLinks?.thumbnail,
        isbn,
      };
    } catch (error) {
      this.logger.warn(`Google Books lookup failed: ${error.message}`);
      return null;
    }
  }
}
