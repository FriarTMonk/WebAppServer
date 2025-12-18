import { Module } from '@nestjs/common';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';

/**
 * Content Module
 *
 * Serves public marketing content from JSON files.
 * No database, no authentication - simple file-based content.
 */
@Module({
  controllers: [ContentController],
  providers: [ContentService],
  exports: [ContentService],
})
export class ContentModule {}
