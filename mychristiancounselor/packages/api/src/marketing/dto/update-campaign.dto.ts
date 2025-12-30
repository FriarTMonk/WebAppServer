import { IsString, IsArray, IsOptional } from 'class-validator';

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
  prospectIds?: string[];
}
