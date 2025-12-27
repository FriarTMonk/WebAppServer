import {
  IsString,
  IsOptional,
  IsIn,
  IsInt,
  Min,
  Max,
  IsISO8601,
} from 'class-validator';

export class UpdateReadingListDto {
  @IsOptional()
  @IsIn(['want_to_read', 'currently_reading', 'finished'])
  status?: 'want_to_read' | 'currently_reading' | 'finished';

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  progress?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsISO8601()
  dateStarted?: string;

  @IsOptional()
  @IsISO8601()
  dateFinished?: string;
}
