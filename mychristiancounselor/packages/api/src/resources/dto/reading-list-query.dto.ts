import { IsOptional, IsIn } from 'class-validator';

export class ReadingListQueryDto {
  @IsOptional()
  @IsIn(['want_to_read', 'currently_reading', 'finished', 'all'])
  status?: 'want_to_read' | 'currently_reading' | 'finished' | 'all' = 'all';
}
