import { IsOptional, IsString, IsInt, Min, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class OrganizationBrowseQueryDto {
  // Pagination
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  take?: number;

  // Filters
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  organizationType?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  // External organizations only (excludes client organizations)
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  externalOnly?: boolean;
}

export class OrganizationListItemDto {
  id: string;
  name: string;
  description?: string;
  organizationTypes?: string[];
  specialtyTags?: string[];
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  phone?: string;
  email?: string;
  website?: string;
  hours?: string;
  recommendationNote?: string;
  isExternal: boolean; // true for ExternalOrganization, false for Organization
}

export class OrganizationBrowseResponseDto {
  organizations: OrganizationListItemDto[];
  total: number;
  skip: number;
  take: number;
}
