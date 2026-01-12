import { IsOptional, IsDateString } from 'class-validator';

export class WellnessChartQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
