import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { CounselService } from './counsel.service';
import { CounselRequestDto } from './dto/counsel-request.dto';

@Controller('counsel')
export class CounselController {
  constructor(private counselService: CounselService) {}

  @Post('ask')
  async ask(@Body() dto: CounselRequestDto) {
    return this.counselService.processQuestion(dto.message, dto.sessionId);
  }

  @Get('session/:id')
  async getSession(@Param('id') id: string) {
    return this.counselService.getSession(id);
  }
}
