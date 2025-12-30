import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsSalesRepGuard } from './guards/is-sales-rep.guard';
import { ProspectsService } from './prospects.service';
import { CreateProspectDto } from './dto/create-prospect.dto';
import { UpdateProspectDto } from './dto/update-prospect.dto';
import { ProspectFiltersDto } from './dto/prospect-filters.dto';

@Controller('marketing/prospects')
@UseGuards(JwtAuthGuard, IsSalesRepGuard)
export class ProspectsController {
  constructor(private prospectsService: ProspectsService) {}

  @Post()
  async createProspect(
    @Req() req: any,
    @Body() dto: CreateProspectDto,
  ) {
    return this.prospectsService.createProspect(req.user.id, dto);
  }

  @Get()
  async listProspects(
    @Req() req: any,
    @Query() filters: ProspectFiltersDto,
  ) {
    return this.prospectsService.listProspects(req.user.id, req.user.isPlatformAdmin || false, filters);
  }

  @Get(':id')
  async getProspect(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    return this.prospectsService.getProspect(req.user.id, req.user.isPlatformAdmin || false, id);
  }

  @Patch(':id')
  async updateProspect(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateProspectDto,
  ) {
    return this.prospectsService.updateProspect(req.user.id, req.user.isPlatformAdmin || false, id, dto);
  }

  @Post(':id/archive')
  async archiveProspect(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    return this.prospectsService.archiveProspect(req.user.id, req.user.isPlatformAdmin || false, id);
  }

  @Post(':id/unarchive')
  async unarchiveProspect(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    return this.prospectsService.unarchiveProspect(req.user.id, req.user.isPlatformAdmin || false, id);
  }

  @Delete(':id')
  async deleteProspect(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    return this.prospectsService.deleteProspect(req.user.id, req.user.isPlatformAdmin || false, id);
  }

  @Post(':id/convert-to-organization')
  async convertToOrganization(
    @Req() req: any,
    @Param('id') prospectId: string,
    @Body('organizationId') organizationId: string,
  ) {
    return this.prospectsService.convertProspectToOrganization(req.user.id, req.user.isPlatformAdmin || false, prospectId, organizationId);
  }

  @Get(':id/campaign-history')
  async getCampaignHistory(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    return this.prospectsService.getCampaignHistory(req.user.id, req.user.isPlatformAdmin || false, id);
  }
}
