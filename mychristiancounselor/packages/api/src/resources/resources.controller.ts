import { Controller, Get, Post, Put, Delete, Query, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OrganizationBrowseService } from './services/organization-browse.service';
import { ExternalOrganizationService } from './services/external-organization.service';
import { ReadingListService } from './services/reading-list.service';
import { ReadingRecommendationsService } from './services/reading-recommendations.service';
import { ReadingListQueryDto } from './dto/reading-list-query.dto';
import { AddToReadingListDto } from './dto/add-to-reading-list.dto';
import { UpdateReadingListDto } from './dto/update-reading-list.dto';
import {
  OrganizationBrowseQueryDto,
  OrganizationBrowseResponseDto,
  CreateExternalOrganizationDto,
} from './dto';
import { UserReadingList } from '@prisma/client';

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
    private readonly readingListService: ReadingListService,
    private readonly readingRecommendationsService: ReadingRecommendationsService,
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

  @Get('reading-list')
  async getReadingList(
    @CurrentUser('id') userId: string,
    @Query() query: ReadingListQueryDto,
  ): Promise<{ items: any[]; total: number }> {
    return this.readingListService.getReadingList(userId, query);
  }

  @Post('reading-list')
  async addToReadingList(
    @CurrentUser('id') userId: string,
    @Body() dto: AddToReadingListDto,
  ): Promise<UserReadingList> {
    return this.readingListService.addToReadingList(userId, dto);
  }

  @Put('reading-list/:itemId')
  async updateReadingListItem(
    @Param('itemId') itemId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateReadingListDto,
  ): Promise<UserReadingList> {
    return this.readingListService.updateReadingListItem(userId, itemId, dto);
  }

  @Delete('reading-list/:itemId')
  async removeFromReadingList(
    @Param('itemId') itemId: string,
    @CurrentUser('id') userId: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.readingListService.removeFromReadingList(userId, itemId);
  }

  @Get('recommendations')
  async getRecommendations(
    @CurrentUser('id') userId: string,
    @Query('limit') limit?: number,
  ) {
    return this.readingRecommendationsService.getRecommendations(userId, limit || 10);
  }
}
