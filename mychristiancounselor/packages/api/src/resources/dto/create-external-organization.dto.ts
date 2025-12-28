import { IsString, IsArray, IsOptional, IsEmail, IsUrl, MinLength, MaxLength, ArrayMinSize } from 'class-validator';

export class CreateExternalOrganizationDto {
  @IsString()
  @MinLength(1, { message: 'Organization name is required' })
  @MaxLength(200, { message: 'Organization name must not exceed 200 characters' })
  name: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1, { message: 'At least one organization type is required' })
  organizationTypes: string[];

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1, { message: 'At least one specialty tag is required' })
  specialtyTags: string[];

  @IsString()
  @MinLength(1, { message: 'Street address is required' })
  @MaxLength(200, { message: 'Street address must not exceed 200 characters' })
  street: string;

  @IsString()
  @MinLength(1, { message: 'City is required' })
  @MaxLength(100, { message: 'City must not exceed 100 characters' })
  city: string;

  @IsString()
  @MinLength(1, { message: 'State is required' })
  @MaxLength(50, { message: 'State must not exceed 50 characters' })
  state: string;

  @IsString()
  @MinLength(1, { message: 'ZIP code is required' })
  @MaxLength(20, { message: 'ZIP code must not exceed 20 characters' })
  zipCode: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Country must not exceed 50 characters' })
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Phone must not exceed 20 characters' })
  phone?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email must be a valid email address' })
  @MaxLength(100, { message: 'Email must not exceed 100 characters' })
  email?: string;

  @IsOptional()
  @IsUrl({}, { message: 'Website must be a valid URL' })
  @MaxLength(500, { message: 'Website must not exceed 500 characters' })
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Hours must not exceed 500 characters' })
  hours?: string;

  @IsString()
  @MinLength(1, { message: 'Recommendation note is required' })
  @MaxLength(1000, { message: 'Recommendation note must not exceed 1000 characters' })
  recommendationNote: string;
}
