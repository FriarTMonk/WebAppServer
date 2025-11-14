import { IsString, MaxLength, IsOptional, MinLength } from 'class-validator';
import { CreateOrganizationDto as ICreateOrganizationDto } from '@mychristiancounselor/shared';

export class CreateOrganizationDto implements ICreateOrganizationDto {
  @IsString()
  @MinLength(1, { message: 'Organization name is required' })
  @MaxLength(100, { message: 'Organization name must not exceed 100 characters' })
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Description must not exceed 500 characters' })
  description?: string;
}
