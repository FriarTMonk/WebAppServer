import { IsOptional, IsString, IsEnum, MaxLength } from 'class-validator';
import { MemberTaskStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @Type(() => Date)
  dueDate?: Date;

  @IsOptional()
  @IsEnum(MemberTaskStatus)
  status?: MemberTaskStatus;
}
