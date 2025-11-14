import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { CounselService } from './counsel.service';
import { CounselRequestDto } from './dto/counsel-request.dto';
import { Public } from '../auth/decorators/public.decorator';

@Controller('counsel')
export class CounselController {
  constructor(private counselService: CounselService) {}

  @Public()
  @Post('ask')
  async ask(@Body() dto: CounselRequestDto) {
    return this.counselService.processQuestion(
      dto.message,
      dto.sessionId,
      dto.preferredTranslation,
      dto.comparisonMode,
      dto.comparisonTranslations
    );
  }

  @Public()
  @Get('session/:id')
  async getSession(@Param('id') id: string) {
    return this.counselService.getSession(id);
  }
}
