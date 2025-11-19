import { IsString, IsDate, IsBoolean, IsOptional, MinLength, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateHolidayDto {
  @IsString()
  @IsOptional()
  @MinLength(3, { message: 'Holiday name must be at least 3 characters' })
  @MaxLength(100, { message: 'Holiday name must not exceed 100 characters' })
  name?: string;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  date?: Date;

  @IsBoolean()
  @IsOptional()
  isRecurring?: boolean;
}
