import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface UpdateOrgBookSettingsDto {
  hiddenBookIds?: string[];
  allowedBookIds?: string[];
}

@Injectable()
export class OrgBookSettingsService {
  private readonly logger = new Logger(OrgBookSettingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get organization book settings (hidden/allowed book IDs)
   */
  async getOrgBookSettings(organizationId: string) {
    this.logger.log(`Getting book settings for organization ${organizationId}`);

    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        hiddenBookIds: true,
        allowedBookIds: true,
      },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    return {
      organizationId: org.id,
      organizationName: org.name,
      hiddenBookIds: org.hiddenBookIds || [],
      allowedBookIds: org.allowedBookIds || [],
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
        hiddenBookIds: dto.hiddenBookIds,
        allowedBookIds: dto.allowedBookIds,
      },
      select: {
        id: true,
        name: true,
        hiddenBookIds: true,
        allowedBookIds: true,
      },
    });

    return {
      organizationId: updated.id,
      organizationName: updated.name,
      hiddenBookIds: updated.hiddenBookIds || [],
      allowedBookIds: updated.allowedBookIds || [],
    };
  }
}
