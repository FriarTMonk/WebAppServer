import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { WellnessChartsService } from '../services/wellness-charts.service';

@Controller('resources/wellness-charts')
@UseGuards(JwtAuthGuard)
export class WellnessChartsController {
  constructor(private wellnessCharts: WellnessChartsService) {}

  @Get('mood-trend')
  async getMoodTrend(
    @CurrentUser('id') userId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.wellnessCharts.getMoodTrend(
      userId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('sleep-trend')
  async getSleepTrend(
    @CurrentUser('id') userId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.wellnessCharts.getSleepTrend(
      userId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('exercise-trend')
  async getExerciseTrend(
    @CurrentUser('id') userId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.wellnessCharts.getExerciseTrend(
      userId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('correlation')
  async getCorrelation(
    @CurrentUser('id') userId: string,
    @Query('metric1') metric1: 'mood' | 'sleep' | 'exercise',
    @Query('metric2') metric2: 'mood' | 'sleep' | 'exercise',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.wellnessCharts.getCorrelation(
      userId,
      metric1,
      metric2,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }
}
