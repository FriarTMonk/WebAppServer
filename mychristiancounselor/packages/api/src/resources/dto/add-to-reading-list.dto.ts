import {
  IsString,
  IsOptional,
  IsIn,
  IsInt,
  Min,
  Max,
  IsISO8601,
} from 'class-validator';

export class AddToReadingListDto {
  @IsString()
  bookId: string;

  @IsOptional()
  @IsIn(['want_to_read', 'currently_reading', 'finished'])
  status?: 'want_to_read' | 'currently_reading' | 'finished' = 'want_to_read';

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
