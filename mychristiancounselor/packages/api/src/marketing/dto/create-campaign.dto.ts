import { IsString, IsArray, IsOptional, IsDateString, IsNotEmpty } from 'class-validator';

export class CreateCampaignDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  htmlBody: string;

  @IsString()
  @IsNotEmpty()
  textBody: string;

  @IsArray()
  @IsString({ each: true })
  prospectContactIds: string[];

  @IsDateString()
  @IsOptional()
  scheduledFor?: string;
}
