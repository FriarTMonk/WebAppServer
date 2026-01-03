import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateProspectContactDto } from './update-prospect-contact.dto';

export class UpdateProspectDto {
  @IsString()
  @IsOptional()
  organizationName?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateProspectContactDto)
  contacts?: UpdateProspectContactDto[];

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
