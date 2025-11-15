import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { CounselService } from './counsel.service';
import { CounselRequestDto } from './dto/counsel-request.dto';
import { Public } from '../auth/decorators/public.decorator';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

@Controller('counsel')
export class CounselController {
  constructor(private counselService: CounselService) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Post('ask')
  async ask(@Body() dto: CounselRequestDto, @Request() req) {
    return this.counselService.processQuestion(
      dto.message,
      dto.sessionId,
      dto.preferredTranslation,
      dto.comparisonMode,
      dto.comparisonTranslations,
      req.user?.id
    );
  }

  @Public()
  @Get('session/:id')
  async getSession(@Param('id') id: string) {
    return this.counselService.getSession(id);
  }
}
