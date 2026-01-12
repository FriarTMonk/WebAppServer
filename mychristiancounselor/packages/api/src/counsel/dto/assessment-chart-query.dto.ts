import { IsOptional, IsDateString, IsUUID } from 'class-validator';

export class AssessmentChartQueryDto {
  @IsUUID()
  memberId: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
