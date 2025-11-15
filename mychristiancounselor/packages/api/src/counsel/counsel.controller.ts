import { Controller, Post, Get, Body, Param, Request, UseGuards } from '@nestjs/common';
import { CounselService } from './counsel.service';
import { CounselRequestDto } from './dto/counsel-request.dto';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

@Controller('counsel')
export class CounselController {
  constructor(private counselService: CounselService) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Post('ask')
  async ask(@Body() dto: CounselRequestDto, @Request() req) {
    // Extract userId if user is authenticated (optional)
    const userId = req.user?.id;

    return this.counselService.processQuestion(
      dto.message,
      dto.sessionId,
      dto.preferredTranslation,
      dto.comparisonMode,
      dto.comparisonTranslations,
      userId
    );
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('session/:id')
  async getSession(@Param('id') id: string) {
    return this.counselService.getSession(id);
  }
}
