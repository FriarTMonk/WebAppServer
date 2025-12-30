import { IsString, IsOptional, IsNotEmpty, IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateProspectContactDto } from './create-prospect-contact.dto';

export class CreateProspectDto {
  @IsString()
  @IsNotEmpty()
  organizationName: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1, { message: 'At least one contact is required' })
  @Type(() => CreateProspectContactDto)
  contacts: CreateProspectContactDto[];

  @IsString()
  @IsOptional()
  website?: string;

  @IsString()
  @IsOptional()
  industry?: string;

  @IsString()
  @IsOptional()
  estimatedSize?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
