import { IsString, MaxLength, IsOptional, MinLength } from 'class-validator';
import { UpdateOrganizationDto as IUpdateOrganizationDto } from '@mychristiancounselor/shared';

export class UpdateOrganizationDto implements IUpdateOrganizationDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Organization name cannot be empty' })
  @MaxLength(100, { message: 'Organization name must not exceed 100 characters' })
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Description must not exceed 500 characters' })
  description?: string;
}
