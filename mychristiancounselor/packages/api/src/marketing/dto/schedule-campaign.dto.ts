import { IsDateString, IsNotEmpty } from 'class-validator';

export class ScheduleCampaignDto {
  @IsDateString()
  @IsNotEmpty()
  scheduledFor: string;
}
