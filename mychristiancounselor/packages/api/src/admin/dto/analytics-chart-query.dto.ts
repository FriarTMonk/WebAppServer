import { IsOptional, IsDateString } from 'class-validator';

export class AnalyticsChartQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
