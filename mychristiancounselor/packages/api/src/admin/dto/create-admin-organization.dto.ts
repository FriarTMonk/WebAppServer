import { IsString, MaxLength, IsOptional, MinLength, IsEmail, IsNumber, IsIn, Min, IsArray } from 'class-validator';
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

  // Resource/browse fields
  @IsArray()
  @IsString({ each: true })
  @MinLength(1, { message: 'At least one specialty tag is required' })
  specialtyTags: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Website must not exceed 500 characters' })
  website?: string;

  @IsString()
  @MinLength(1, { message: 'Street address is required' })
  @MaxLength(500, { message: 'Street address must not exceed 500 characters' })
  street: string;

  @IsString()
  @MinLength(1, { message: 'City is required' })
  @MaxLength(100, { message: 'City must not exceed 100 characters' })
  city: string;

  @IsString()
  @MinLength(2, { message: 'State is required' })
  @MaxLength(2, { message: 'State must be 2 characters' })
  state: string;

  @IsString()
  @MinLength(1, { message: 'ZIP code is required' })
  @MaxLength(20, { message: 'ZIP code must not exceed 20 characters' })
  zipCode: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Country must not exceed 100 characters' })
  country?: string;
}
