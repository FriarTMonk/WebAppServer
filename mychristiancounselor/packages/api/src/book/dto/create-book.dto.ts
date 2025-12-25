import {
  IsString,
  IsOptional,
  IsInt,
  IsUrl,
  IsEnum,
  ValidateIf,
  Min,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';

export type PdfLicenseType = 'public_domain' | 'creative_commons' | 'publisher_permission' | 'analysis_only';

export class CreateBookDto {
  // Lookup methods (mutually exclusive with manual entry)
  @IsOptional()
  @IsString()
  isbn?: string;

  @IsOptional()
  @IsUrl()
  lookupUrl?: string;

  // Manual entry fields (required if no ISBN/URL)
  @ValidateIf((o) => !o.isbn && !o.lookupUrl)
  @IsString()
  title?: string;

  @ValidateIf((o) => !o.isbn && !o.lookupUrl)
  @IsString()
  author?: string;

  // Optional fields for manual entry or override
  @IsOptional()
  @IsString()
  publisher?: string;

  @IsOptional()
  @Transform(({ value }) => value ? parseInt(value, 10) : undefined)
  @IsInt()
  @Min(1000)
  @Max(new Date().getFullYear() + 1)
  publicationYear?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUrl()
  coverImageUrl?: string;

  // PDF upload fields
  @IsOptional()
  @IsEnum(['public_domain', 'creative_commons', 'publisher_permission', 'analysis_only'])
  pdfLicenseType?: PdfLicenseType;
}
