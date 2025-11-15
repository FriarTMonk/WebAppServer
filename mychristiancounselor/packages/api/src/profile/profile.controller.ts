import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('profile')
export class ProfileController {
  constructor(private profileService: ProfileService) {}

  @UseGuards(JwtAuthGuard)
  @Get('history')
  async getHistory(
    @Request() req,
    @Query('search') search?: string,
    @Query('topics') topics?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('status') status?: 'active' | 'archived',
  ) {
    const topicsArray = topics ? topics.split(',') : undefined;
    const dateFromParsed = dateFrom ? new Date(dateFrom) : undefined;
    const dateToParsed = dateTo ? new Date(dateTo) : undefined;

    return this.profileService.getHistory(
      req.user.id,
      search,
      topicsArray,
      dateFromParsed,
      dateToParsed,
      status || 'active',
    );
  }
}
