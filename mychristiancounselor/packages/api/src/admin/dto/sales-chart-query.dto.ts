import { IsOptional, IsDateString } from 'class-validator';

export class SalesChartQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
