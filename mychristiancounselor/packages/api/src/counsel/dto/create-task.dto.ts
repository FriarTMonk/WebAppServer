import { IsString, IsNotEmpty, IsEnum, IsOptional, IsDateString, IsUUID, MaxLength } from 'class-validator';
import { MemberTaskType } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateTaskDto {
  @IsUUID()
  @IsNotEmpty()
  memberId: string;

  @IsUUID()
  @IsNotEmpty()
  counselorId: string;

  @IsEnum(MemberTaskType)
  @IsNotEmpty()
  type: MemberTaskType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  description: string;

  @IsOptional()
  @Type(() => Date)
  dueDate?: Date;

  @IsOptional()
  metadata?: Record<string, any>;
}
