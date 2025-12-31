import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WellbeingHistoryService } from './wellbeing-history.service';
import { TrajectoryCalculationService } from './trajectory-calculation.service';
import { SessionSummaryService } from './session-summary.service';

@Controller('counsel/wellbeing')
@UseGuards(JwtAuthGuard)
export class WellbeingController {
  constructor(
    private historyService: WellbeingHistoryService,
    private trajectoryService: TrajectoryCalculationService,
    private summaryService: SessionSummaryService,
  ) {}

  /**
   * Get wellbeing history for current user
   */
  @Get('history')
  async getHistory(
    @Request() req: any,
    @Query('limit') limit?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const options: any = {};
    if (limit) options.limit = parseInt(limit);
    if (startDate) options.startDate = new Date(startDate);
    if (endDate) options.endDate = new Date(endDate);

    return this.historyService.getHistory(req.user.id, options);
  }

  /**
   * Get trajectory for current user
   */
  @Get('trajectory')
  async getTrajectory(@Request() req: any) {
    const trajectory = await this.trajectoryService.calculateTrajectory(req.user.id);
    const explanation = this.trajectoryService.getTrajectoryExplanation(trajectory);

    return {
      trajectory,
      explanation,
    };
  }

  /**
   * Get recent session summaries
   */
  @Get('summaries')
  async getSummaries(
    @Request() req: any,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit) : 5;
    return this.summaryService.getRecentSummaries(req.user.id, limitNum);
  }

  /**
   * Get session summary by ID
   */
  @Get('summaries/:sessionId')
  async getSummary(@Param('sessionId') sessionId: string) {
    return this.summaryService.getSummary(sessionId);
  }
}
