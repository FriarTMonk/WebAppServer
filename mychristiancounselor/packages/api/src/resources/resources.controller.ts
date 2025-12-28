import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OrganizationBrowseService } from './services/organization-browse.service';
import {
  OrganizationBrowseQueryDto,
  OrganizationBrowseResponseDto,
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
  ) {}

  @Get('organizations')
  async browseOrganizations(
    @CurrentUser('id') userId: string,
    @Query() query: OrganizationBrowseQueryDto,
  ): Promise<OrganizationBrowseResponseDto> {
    return this.organizationBrowseService.browseOrganizations(query, userId);
  }
}
