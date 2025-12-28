import {
  IsString,
  IsOptional,
  IsInt,
  IsUrl,
  ValidateIf,
  Min,
  Max,
  IsNotEmpty,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateBookDto {
  // Lookup methods (mutually exclusive with manual entry)
  @IsOptional()
  @IsString()
  isbn?: string;

  @IsOptional()
  @IsUrl()
  lookupUrl?: string;

  @IsOptional()
  @IsUrl()
  purchaseUrl?: string;

  // Manual entry fields (required if no ISBN/URL)
  @ValidateIf((o) => !o.isbn && !o.lookupUrl)
  @IsString()
  @IsNotEmpty()
  title?: string;

  @ValidateIf((o) => !o.isbn && !o.lookupUrl)
  @IsString()
  @IsNotEmpty()
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
}
