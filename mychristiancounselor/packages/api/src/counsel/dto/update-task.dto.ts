import { IsOptional, IsString, IsDateString, IsEnum, MaxLength } from 'class-validator';
import { MemberTaskStatus } from '@prisma/client';

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
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsEnum(MemberTaskStatus)
  status?: MemberTaskStatus;
}
