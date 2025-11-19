import { IsString, IsNotEmpty, IsDate, IsBoolean, IsOptional, MinLength, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateHolidayDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'Holiday name must be at least 3 characters' })
  @MaxLength(100, { message: 'Holiday name must not exceed 100 characters' })
  name: string;

  @IsDate()
  @Type(() => Date)
  date: Date;

  @IsBoolean()
  @IsOptional()
  isRecurring?: boolean;
}
