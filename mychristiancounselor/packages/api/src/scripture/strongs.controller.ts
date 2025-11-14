import { Controller, Get, Param, Query, Post, Body } from '@nestjs/common';
import { StrongsService } from './strongs.service';
import { StrongsDefinition } from '@mychristiancounselor/shared';
import { Public } from '../auth/decorators/public.decorator';

@Public()
@Controller('strongs')
export class StrongsController {
  constructor(private readonly strongsService: StrongsService) {}

  /**
   * GET /strongs/:number
   * Get a single Strong's definition
   */
  @Get(':number')
  getDefinition(@Param('number') number: string): StrongsDefinition | null {
    return this.strongsService.getDefinition(number);
  }

  /**
   * POST /strongs/bulk
   * Get multiple Strong's definitions at once
   * Body: { numbers: string[] }
   */
  @Post('bulk')
  getDefinitions(
    @Body() body: { numbers: string[] }
  ): Record<string, StrongsDefinition> {
    return this.strongsService.getDefinitions(body.numbers);
  }

  /**
   * GET /strongs/stats
   * Get statistics about loaded dictionaries
   */
  @Get('stats')
  getStatistics() {
    return this.strongsService.getStatistics();
  }

  /**
   * GET /strongs/search?q=keyword&limit=20
   * Search Strong's definitions
   */
  @Get('search')
  searchDefinitions(
    @Query('q') keyword: string,
    @Query('limit') limit?: string
  ): StrongsDefinition[] {
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.strongsService.searchDefinitions(keyword, limitNum);
  }
}
