import { IsString, IsEmail, IsOptional, IsNotEmpty, IsBoolean, IsDateString } from 'class-validator';

/**
 * DTO for updating a prospect contact
 * Allows optional database fields that are sent by the frontend but ignored by the API
 */
export class UpdateProspectContactDto {
  @IsString()
  @IsOptional()
  id?: string; // If present, update existing contact; if absent, create new

  @IsString()
  @IsOptional()
  prospectId?: string; // Database field, ignored

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;

  @IsDateString()
  @IsOptional()
  createdAt?: string; // Database field, ignored

  @IsDateString()
  @IsOptional()
  updatedAt?: string; // Database field, ignored
}
