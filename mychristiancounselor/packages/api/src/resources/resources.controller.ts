import { Controller, Get, Post, Put, Query, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OrganizationBrowseService } from './services/organization-browse.service';
import { ExternalOrganizationService } from './services/external-organization.service';
import {
  OrganizationBrowseQueryDto,
  OrganizationBrowseResponseDto,
  CreateExternalOrganizationDto,
} from './dto';

/**
 * Controller for resources endpoints (reading lists, organizations, recommendations).
 * Base path: /resources
 */
@Controller('resources')
@UseGuards(JwtAuthGuard)
export class ResourcesController {
  constructor(
    private readonly organizationBrowseService: OrganizationBrowseService,
    private readonly externalOrganizationService: ExternalOrganizationService,
  ) {}

  @Get('organizations')
  async browseOrganizations(
    @CurrentUser('id') userId: string,
    @Query() query: OrganizationBrowseQueryDto,
  ): Promise<OrganizationBrowseResponseDto> {
    return this.organizationBrowseService.browseOrganizations(query, userId);
  }

  @Post('organizations/external')
  async createExternalOrganization(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateExternalOrganizationDto,
  ) {
    return this.externalOrganizationService.createExternalOrganization(userId, dto);
  }

  @Put('organizations/external/:id')
  async updateExternalOrganization(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateExternalOrganizationDto,
  ) {
    return this.externalOrganizationService.updateExternalOrganization(id, userId, dto);
  }
}
