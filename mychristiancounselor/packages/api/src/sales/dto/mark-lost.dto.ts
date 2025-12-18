import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { LossReason } from '@prisma/client';

export class MarkLostDto {
  @IsEnum(LossReason)
  lossReason: LossReason;

  @IsOptional()
  @IsString()
  @Length(10, 2000)
  notes?: string;
}
