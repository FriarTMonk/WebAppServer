export class OrganizationBrowseQueryDto {
  // Pagination
  skip?: number;
  take?: number;

  // Filters
  search?: string;
  organizationType?: string;
  city?: string;
  state?: string;
}

export class OrganizationListItemDto {
  id: string;
  name: string;
  description?: string;
  organizationTypes?: string[];
  city?: string;
  state?: string;
  zipCode?: string;
  phone?: string;
  email?: string;
  website?: string;
  isExternal: boolean; // true for ExternalOrganization, false for Organization
}

export class OrganizationBrowseResponseDto {
  organizations: OrganizationListItemDto[];
  total: number;
  skip: number;
  take: number;
}
