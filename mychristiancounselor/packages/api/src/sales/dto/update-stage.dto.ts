import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SalesStage } from '@prisma/client';

export class UpdateStageDto {
  @IsEnum(SalesStage)
  stage: SalesStage;

  @IsOptional()
  @IsString()
  notes?: string;
}
