import { IsString, IsNotEmpty, IsUUID, IsOptional, IsBoolean, IsArray } from 'class-validator';
import { BibleTranslation } from '@mychristiancounselor/shared';

export class CounselRequestDto {
  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsOptional()
  @IsString()
  preferredTranslation?: BibleTranslation;

  @IsOptional()
  @IsBoolean()
  comparisonMode?: boolean;

  @IsOptional()
  @IsArray()
  comparisonTranslations?: BibleTranslation[];
}
