import { IsString, IsArray, IsOptional, IsDateString } from 'class-validator';

export class UpdateCampaignDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  subject?: string;

  @IsString()
  @IsOptional()
  htmlBody?: string;

  @IsString()
  @IsOptional()
  textBody?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  prospectContactIds?: string[];

  @IsDateString()
  @IsOptional()
  scheduledFor?: string;
}
