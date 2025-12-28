import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { IBookMetadataProvider, BookMetadata } from './metadata.provider.interface';
import { GoogleBooksProvider } from './google-books.provider';
import { ChristianBookProvider } from './christianbook.provider';
import { resourcesConfig } from '../../../config/resources.config';

@Injectable()
export class MetadataAggregatorService implements OnModuleInit {
  private readonly logger = new Logger(MetadataAggregatorService.name);
  private providers: Map<string, IBookMetadataProvider> = new Map();

  constructor(
    private readonly googleBooksProvider: GoogleBooksProvider,
    private readonly christianBookProvider: ChristianBookProvider,
  ) {}

  onModuleInit() {
    // Register providers in priority order
    this.registerProvider('christianbook', this.christianBookProvider);
    this.registerProvider('google-books', this.googleBooksProvider);
  }

  registerProvider(name: string, provider: IBookMetadataProvider): void {
    this.providers.set(name, provider);
    this.logger.log(`Registered metadata provider: ${name}`);
  }

  async lookup(identifier: string): Promise<BookMetadata | null> {
    // Data-driven: Use config to determine priority
    const config = resourcesConfig.lookup.apiPriority;

    for (const apiConfig of config) {
      if (!apiConfig.enabled) continue;

      const provider = this.providers.get(apiConfig.name);
      if (!provider) continue;

      if (!provider.supports(identifier)) continue;

      this.logger.log(`Trying ${apiConfig.name} for ${identifier}`);

      const result = await provider.lookup(identifier);
      if (result) {
        this.logger.log(`Found metadata via ${apiConfig.name}`);
        return result;
      }
    }

    return null;
  }
}
