import { IsString, IsOptional, IsIn, IsNumber, Min, IsDateString, Length } from 'class-validator';

export class RecordActivityDto {
  @IsIn(['call', 'email', 'meeting', 'demo', 'proposal'])
  activityType: string;

  @IsString()
  @Length(5, 200)
  subject: string;

  @IsOptional()
  @IsString()
  @Length(10, 5000)
  notes?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  duration?: number;

  @IsOptional()
  @IsIn(['positive', 'neutral', 'negative', 'no_response'])
  outcome?: string;

  @IsOptional()
  @IsDateString()
  nextFollowUpAt?: string;
}
