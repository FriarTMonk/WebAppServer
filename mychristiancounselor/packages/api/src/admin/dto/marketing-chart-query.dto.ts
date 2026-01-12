import { IsOptional, IsDateString, IsUUID } from 'class-validator';

export class MarketingChartQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsUUID()
  campaignId?: string;
}
