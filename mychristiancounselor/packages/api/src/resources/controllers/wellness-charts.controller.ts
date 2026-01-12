import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { WellnessChartsService } from '../services/wellness-charts.service';
import { WellnessChartQueryDto } from '../dto/wellness-chart-query.dto';
import { CorrelationQueryDto } from '../dto/correlation-query.dto';

@Controller('resources/wellness-charts')
@UseGuards(JwtAuthGuard)
export class WellnessChartsController {
  constructor(private wellnessCharts: WellnessChartsService) {}

  @Get('mood-trend')
  async getMoodTrend(
    @CurrentUser('id') userId: string,
    @Query() query: WellnessChartQueryDto,
  ) {
    return this.wellnessCharts.getMoodTrend(
      userId,
      query.startDate ? new Date(query.startDate) : undefined,
      query.endDate ? new Date(query.endDate) : undefined,
    );
  }

  @Get('sleep-trend')
  async getSleepTrend(
    @CurrentUser('id') userId: string,
    @Query() query: WellnessChartQueryDto,
  ) {
    return this.wellnessCharts.getSleepTrend(
      userId,
      query.startDate ? new Date(query.startDate) : undefined,
      query.endDate ? new Date(query.endDate) : undefined,
    );
  }

  @Get('exercise-trend')
  async getExerciseTrend(
    @CurrentUser('id') userId: string,
    @Query() query: WellnessChartQueryDto,
  ) {
    return this.wellnessCharts.getExerciseTrend(
      userId,
      query.startDate ? new Date(query.startDate) : undefined,
      query.endDate ? new Date(query.endDate) : undefined,
    );
  }

  @Get('correlation')
  async getCorrelation(
    @CurrentUser('id') userId: string,
    @Query() query: CorrelationQueryDto,
  ) {
    return this.wellnessCharts.getCorrelation(
      userId,
      query.metric1,
      query.metric2,
      query.startDate ? new Date(query.startDate) : undefined,
      query.endDate ? new Date(query.endDate) : undefined,
    );
  }
}
