import { IsString, IsOptional, IsIn } from 'class-validator';

export class CampaignFiltersDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  @IsIn(['draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled'])
  status?: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed' | 'cancelled';

  @IsString()
  @IsOptional()
  @IsIn(['name', 'status', 'createdAt', 'sentAt', 'scheduledFor'])
  sortBy?: string;

  @IsString()
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
