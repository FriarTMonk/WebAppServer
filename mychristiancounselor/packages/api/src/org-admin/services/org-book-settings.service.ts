import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface UpdateOrgBookSettingsDto {
  allowedVisibilityTiers?: string[];
  customBookIds?: string[];
}

@Injectable()
export class OrgBookSettingsService {
  private readonly logger = new Logger(OrgBookSettingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get organization book settings (visibility tiers and custom book IDs)
   */
  async getOrgBookSettings(organizationId: string) {
    this.logger.log(`Getting book settings for organization ${organizationId}`);

    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        allowedVisibilityTiers: true,
        customBookIds: true,
      },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    return {
      organizationId: org.id,
      organizationName: org.name,
      allowedVisibilityTiers: org.allowedVisibilityTiers || [],
      customBookIds: org.customBookIds || [],
    };
  }

  /**
   * Update organization book settings
   */
  async updateOrgBookSettings(
    organizationId: string,
    dto: UpdateOrgBookSettingsDto,
  ) {
    this.logger.log(`Updating book settings for organization ${organizationId}`);

    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const updated = await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        allowedVisibilityTiers: dto.allowedVisibilityTiers,
        customBookIds: dto.customBookIds,
      },
      select: {
        id: true,
        name: true,
        allowedVisibilityTiers: true,
        customBookIds: true,
      },
    });

    return {
      organizationId: updated.id,
      organizationName: updated.name,
      allowedVisibilityTiers: updated.allowedVisibilityTiers || [],
      customBookIds: updated.customBookIds || [],
    };
  }
}
