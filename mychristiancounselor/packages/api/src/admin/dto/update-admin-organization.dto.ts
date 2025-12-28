import { IsString, MaxLength, IsOptional, MinLength, IsNumber, IsIn, Min, IsArray } from 'class-validator';

export class UpdateAdminOrganizationDto {
  @IsString()
  @MinLength(1, { message: 'Organization name is required' })
  @MaxLength(100, { message: 'Organization name must not exceed 100 characters' })
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Description must not exceed 500 characters' })
  description?: string;

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

  // Resource/browse fields (optional for legacy organizations)
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialtyTags?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Website must not exceed 500 characters' })
  website?: string;

  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Street address cannot be empty if provided' })
  @MaxLength(500, { message: 'Street address must not exceed 500 characters' })
  street?: string;

  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'City cannot be empty if provided' })
  @MaxLength(100, { message: 'City must not exceed 100 characters' })
  city?: string;

  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'State must be 2 characters' })
  @MaxLength(2, { message: 'State must be 2 characters' })
  state?: string;

  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'ZIP code cannot be empty if provided' })
  @MaxLength(20, { message: 'ZIP code must not exceed 20 characters' })
  zipCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Country must not exceed 100 characters' })
  country?: string;
}
