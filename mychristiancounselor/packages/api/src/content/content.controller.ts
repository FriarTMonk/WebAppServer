import { Controller, Get } from '@nestjs/common';
import { ContentService } from './content.service';
import { Public } from '../auth/decorators/public.decorator';

/**
 * Content Controller
 *
 * Serves public marketing content (FAQs, Testimonials) from JSON files.
 * No authentication required - this is public content.
 */
@Controller('content')
@Public()
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  /**
   * GET /content/faqs
   * Returns published FAQs sorted by displayOrder
   */
  @Get('faqs')
  async getFaqs() {
    return this.contentService.getFaqs();
  }

  /**
   * GET /content/testimonials
   * Returns published testimonials sorted by displayOrder, featured first
   */
  @Get('testimonials')
  async getTestimonials() {
    return this.contentService.getTestimonials();
  }
}
