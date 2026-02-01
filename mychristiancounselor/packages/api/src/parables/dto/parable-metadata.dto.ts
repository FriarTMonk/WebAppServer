import { IsString, IsDate, IsBoolean, IsOptional, IsInt } from 'class-validator';

export class ParableMetadataDto {
  @IsString()
  id: string;

  @IsString()
  slug: string;

  @IsString()
  title: string;

  @IsDate()
  publishedDate: Date;

  @IsBoolean()
  isFeatured: boolean;

  @IsString()
  category: string;

  @IsInt()
  sortOrder: number;

  @IsBoolean()
  isActive: boolean;
}

export class SaveParableDto {
  @IsString()
  @IsOptional()
  reflectionNotes?: string;
}

export class UpdateReflectionDto {
  @IsString()
  reflectionNotes: string;

  @IsBoolean()
  @IsOptional()
  isCompleted?: boolean;
}
