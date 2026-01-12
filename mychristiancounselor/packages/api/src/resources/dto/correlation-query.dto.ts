import { IsIn } from 'class-validator';
import { WellnessChartQueryDto } from './wellness-chart-query.dto';

export class CorrelationQueryDto extends WellnessChartQueryDto {
  @IsIn(['mood', 'sleep', 'exercise'])
  metric1: 'mood' | 'sleep' | 'exercise';

  @IsIn(['mood', 'sleep', 'exercise'])
  metric2: 'mood' | 'sleep' | 'exercise';
}
