import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  OrganizationBrowseQueryDto,
  OrganizationBrowseResponseDto,
  OrganizationListItemDto,
} from '../dto';

@Injectable()
export class OrganizationBrowseService {
  private readonly logger = new Logger(OrganizationBrowseService.name);

  constructor(private readonly prisma: PrismaService) {}

  async browseOrganizations(
    query: OrganizationBrowseQueryDto,
    userId: string,
  ): Promise<OrganizationBrowseResponseDto> {
    const {
      search,
      organizationType,
      city,
      state,
      externalOnly = false,
      skip = 0,
      take = 20,
    } = query;

    this.logger.log(
      `Browsing organizations with query: ${JSON.stringify(query)}, userId: ${userId}`,
    );

    // Get user info (org memberships and platform admin status)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        isPlatformAdmin: true,
        organizationMemberships: {
          select: { organizationId: true },
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const userOrgIds = user.organizationMemberships?.map(m => m.organizationId) || [];
    const isPlatformAdmin = user.isPlatformAdmin ?? false;

    // Build WHERE clause for registered organizations
    const registeredOrgWhere = this.buildRegisteredOrgWhereClause(
      search,
      organizationType,
      city,
      state,
    );

    // Build WHERE clause for external organizations
    const externalOrgWhere = this.buildExternalOrgWhereClause(
      search,
      organizationType,
      city,
      state,
      userOrgIds,
      isPlatformAdmin,
    );

    // Fetch both registered and external organizations in parallel
    // If externalOnly is true, skip fetching client organizations
    const [registeredOrgs, externalOrgs] = await Promise.all([
      externalOnly ? Promise.resolve([]) : this.prisma.organization.findMany({
        where: registeredOrgWhere,
        skip,
        take,
        select: {
          id: true,
          name: true,
          description: true,
          specialtyTags: true,
          website: true,
          organizationAddress: {
            select: {
              street: true,
              city: true,
              state: true,
              zipCode: true,
              country: true,
            },
          },
        },
        orderBy: [{ name: 'asc' }],
      }),
      // Only fetch external orgs if user is in an org or is platform admin
      (userOrgIds.length > 0 || isPlatformAdmin)
        ? this.prisma.externalOrganization.findMany({
            where: externalOrgWhere,
            select: {
              id: true,
              name: true,
              organizationTypes: true,
              specialtyTags: true,
              phone: true,
              email: true,
              website: true,
              hours: true,
              recommendationNote: true,
              organizationAddress: {
                select: {
                  street: true,
                  city: true,
                  state: true,
                  zipCode: true,
                  country: true,
                },
              },
            },
            orderBy: [{ name: 'asc' }],
          })
        : Promise.resolve([]),
    ]);

    // Map to DTOs
    const registeredOrgDtos: OrganizationListItemDto[] = registeredOrgs.map((org) => ({
      id: org.id,
      name: org.name,
      description: org.description ?? undefined,
      organizationTypes: org.specialtyTags,
      website: org.website ?? undefined,
      city: org.organizationAddress?.city,
      state: org.organizationAddress?.state,
      zipCode: org.organizationAddress?.zipCode,
      isExternal: false,
    }));

    const externalOrgDtos: OrganizationListItemDto[] = externalOrgs.map((org) => ({
      id: org.id,
      name: org.name,
      organizationTypes: org.organizationTypes,
      specialtyTags: org.specialtyTags,
      street: org.organizationAddress?.street,
      city: org.organizationAddress?.city,
      state: org.organizationAddress?.state,
      zipCode: org.organizationAddress?.zipCode,
      phone: org.phone ?? undefined,
      email: org.email ?? undefined,
      website: org.website ?? undefined,
      hours: org.hours ?? undefined,
      recommendationNote: org.recommendationNote ?? undefined,
      isExternal: true,
    }));

    // Combine and sort by name
    const allOrgs = [...registeredOrgDtos, ...externalOrgDtos].sort((a, b) =>
      a.name.localeCompare(b.name),
    );

    return {
      organizations: allOrgs,
      total: allOrgs.length,
      skip,
      take,
    };
  }

  private buildRegisteredOrgWhereClause(
    search?: string,
    organizationType?: string,
    city?: string,
    state?: string,
  ): any {
    const where: any = {
      AND: [],
    };

    // Exclude archived organizations
    where.AND.push({ archivedAt: null });

    // NEVER show platform organizations (isSystemOrganization=true) in browse
    where.AND.push({ isSystemOrganization: false });

    // Search filter (name or description)
    if (search) {
      where.AND.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    // City and State filters for registered organizations
    if (city) {
      where.AND.push({
        organizationAddress: {
          city: { contains: city, mode: 'insensitive' },
        },
      });
    }

    if (state) {
      where.AND.push({
        organizationAddress: {
          state: { equals: state, mode: 'insensitive' },
        },
      });
    }

    // Note: Registered organizations don't have organizationType field
    // That filter only applies to external organizations

    return where;
  }

  private buildExternalOrgWhereClause(
    search?: string,
    organizationType?: string,
    city?: string,
    state?: string,
    userOrgIds?: string[],
    isPlatformAdmin?: boolean,
  ): any {
    const where: any = {
      AND: [],
    };

    // Visibility filter: only show external orgs from user's organizations
    // Unless user is platform admin
    if (!isPlatformAdmin && userOrgIds && userOrgIds.length > 0) {
      where.AND.push({
        recommendedByOrganizationId: { in: userOrgIds },
      });
    }

    // Search filter (name)
    if (search) {
      where.AND.push({
        name: { contains: search, mode: 'insensitive' },
      });
    }

    // Organization type filter
    if (organizationType) {
      where.AND.push({
        organizationTypes: { has: organizationType },
      });
    }

    // City and State filters now reference the organizationAddress relationship
    if (city) {
      where.AND.push({
        organizationAddress: {
          city: { contains: city, mode: 'insensitive' },
        },
      });
    }

    if (state) {
      where.AND.push({
        organizationAddress: {
          state: { equals: state, mode: 'insensitive' },
        },
      });
    }

    return where;
  }
}
