import { Injectable, Logger, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateExternalOrganizationDto } from '../dto';

@Injectable()
export class ExternalOrganizationService {
  private readonly logger = new Logger(ExternalOrganizationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new external organization (org admins and counselors)
   */
  async createExternalOrganization(
    userId: string,
    dto: CreateExternalOrganizationDto,
  ) {
    this.logger.log('Creating external organization: ' + dto.name + ' by user ' + userId);

    // Get user's organization membership and role
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        organizationMemberships: {
          select: {
            organizationId: true,
            role: {
              select: {
                name: true,
                permissions: true,
              },
            },
          },
        },
      },
    });

    if (!user || user.organizationMemberships.length === 0) {
      throw new ForbiddenException('You must be a member of an organization to add external organizations');
    }

    // Check if user has permission (org admin, counselor, or owner)
    const membership = user.organizationMemberships[0];
    const roleName = membership.role.name.toLowerCase().trim();

    // More flexible role checking - check if role name contains admin, counselor, or owner
    const hasPermission = roleName.includes('counselor') ||
                          roleName.includes('admin') ||
                          roleName.includes('owner');

    this.logger.log(`CREATE - User role: "${membership.role.name}", normalized: "${roleName}", hasPermission: ${hasPermission}`);

    if (!hasPermission) {
      throw new ForbiddenException('Only organization administrators and counselors can add external organizations');
    }

    const organizationId = membership.organizationId;

    // Create normalized address for deduplication
    const normalizedAddress = this.normalizeAddress(
      dto.street,
      dto.city,
      dto.state,
      dto.zipCode,
    );

    // Find or create the address
    const address = await this.prisma.organizationAddress.upsert({
      where: { normalizedAddress },
      create: {
        street: dto.street,
        city: dto.city,
        state: dto.state,
        zipCode: dto.zipCode,
        country: dto.country || 'USA',
        normalizedAddress,
      },
      update: {},
    });

    // Create the external organization
    const externalOrg = await this.prisma.externalOrganization.create({
      data: {
        name: dto.name,
        organizationTypes: dto.organizationTypes,
        specialtyTags: dto.specialtyTags,
        organizationAddressId: address.id,
        phone: dto.phone,
        email: dto.email,
        website: dto.website,
        hours: dto.hours,
        recommendationNote: dto.recommendationNote,
        recommendedByOrganizationId: organizationId,
        addedById: userId,
      },
      include: {
        organizationAddress: true,
        recommendedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    this.logger.log('Created external organization ' + externalOrg.id + ' for organization ' + organizationId);

    return externalOrg;
  }

  /**
   * Update an existing external organization
   */
  async updateExternalOrganization(
    organizationId: string,
    userId: string,
    dto: CreateExternalOrganizationDto,
  ) {
    this.logger.log('Updating external organization: ' + organizationId + ' by user ' + userId);

    // Get user's organization membership and role
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        organizationMemberships: {
          select: {
            organizationId: true,
            role: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user || user.organizationMemberships.length === 0) {
      throw new ForbiddenException('You must be a member of an organization');
    }

    const membership = user.organizationMemberships[0];
    const roleName = membership.role.name.toLowerCase().trim();

    // More flexible role checking - check if role name contains admin, counselor, or owner
    const hasPermission = roleName.includes('counselor') ||
                          roleName.includes('admin') ||
                          roleName.includes('owner');

    this.logger.log(`UPDATE - User role: "${membership.role.name}", normalized: "${roleName}", hasPermission: ${hasPermission}`);

    if (!hasPermission) {
      throw new ForbiddenException('Only organization administrators and counselors can update external organizations');
    }

    // Verify the organization belongs to the user's organization
    const existingOrg = await this.prisma.externalOrganization.findUnique({
      where: { id: organizationId },
      select: { recommendedByOrganizationId: true },
    });

    if (!existingOrg) {
      throw new BadRequestException('External organization not found');
    }

    if (existingOrg.recommendedByOrganizationId !== membership.organizationId) {
      throw new ForbiddenException('You can only update organizations from your own organization');
    }

    // Create normalized address for deduplication
    const normalizedAddress = this.normalizeAddress(
      dto.street,
      dto.city,
      dto.state,
      dto.zipCode,
    );

    // Find or create the address
    const address = await this.prisma.organizationAddress.upsert({
      where: { normalizedAddress },
      create: {
        street: dto.street,
        city: dto.city,
        state: dto.state,
        zipCode: dto.zipCode,
        country: dto.country || 'USA',
        normalizedAddress,
      },
      update: {},
    });

    // Update the external organization
    const updatedOrg = await this.prisma.externalOrganization.update({
      where: { id: organizationId },
      data: {
        name: dto.name,
        organizationTypes: dto.organizationTypes,
        specialtyTags: dto.specialtyTags,
        organizationAddressId: address.id,
        phone: dto.phone,
        email: dto.email,
        website: dto.website,
        hours: dto.hours,
        recommendationNote: dto.recommendationNote,
      },
      include: {
        organizationAddress: true,
        recommendedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    this.logger.log('Updated external organization ' + updatedOrg.id);

    return updatedOrg;
  }

  /**
   * Normalize address for deduplication
   * Format: "STREET|CITY|STATE|ZIP"
   */
  private normalizeAddress(
    street: string,
    city: string,
    state: string,
    zipCode: string,
  ): string {
    const normalize = (str: string) => str.toUpperCase().trim().replace(/\s+/g, ' ');
    return normalize(street) + '|' + normalize(city) + '|' + normalize(state) + '|' + normalize(zipCode);
  }
}
