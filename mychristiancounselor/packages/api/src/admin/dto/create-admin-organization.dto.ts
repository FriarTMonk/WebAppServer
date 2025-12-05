import { IsString, MaxLength, IsOptional, MinLength, IsEmail, IsNumber, IsIn, Min } from 'class-validator';
import { CreateAdminOrganizationDto as ICreateAdminOrganizationDto } from '@mychristiancounselor/shared';

export class CreateAdminOrganizationDto implements ICreateAdminOrganizationDto {
  @IsString()
  @MinLength(1, { message: 'Organization name is required' })
  @MaxLength(100, { message: 'Organization name must not exceed 100 characters' })
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Description must not exceed 500 characters' })
  description?: string;

  @IsEmail({}, { message: 'Valid owner email is required' })
  ownerEmail: string;

  @IsOptional()
  @IsString()
  @IsIn(['Family', 'Small', 'Medium', 'Large'], { message: 'Invalid license type' })
  licenseType?: string;

  @IsOptional()
  @IsString()
  @IsIn(['trial', 'active', 'expired', 'cancelled'], { message: 'Invalid license status' })
  licenseStatus?: string;

  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'Max members must be at least 1' })
  maxMembers?: number;
}
