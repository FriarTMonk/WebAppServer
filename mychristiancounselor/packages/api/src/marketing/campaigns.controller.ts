import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsSalesRepGuard } from './guards/is-sales-rep.guard';
import { CampaignsService } from './campaigns.service';
import { CampaignExecutionService } from './campaign-execution.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { CampaignFiltersDto } from './dto/campaign-filters.dto';
import { ScheduleCampaignDto } from './dto/schedule-campaign.dto';
import { CheckProspectsDto } from './dto/check-prospects.dto';

@Controller('marketing/campaigns')
@UseGuards(JwtAuthGuard, IsSalesRepGuard)
export class CampaignsController {
  constructor(
    private campaignsService: CampaignsService,
    private campaignExecutionService: CampaignExecutionService,
  ) {}

  @Post()
  async createCampaign(
    @Req() req: any,
    @Body() dto: CreateCampaignDto,
  ) {
    return this.campaignsService.createCampaign(req.user.id, dto);
  }

  @Get('metrics')
  async getMetrics(
    @Req() req: any,
  ) {
    return this.campaignsService.getMetrics(req.user.id, req.user.isPlatformAdmin || false);
  }

  @Get()
  async listCampaigns(
    @Req() req: any,
    @Query() filters: CampaignFiltersDto,
  ) {
    return this.campaignsService.listCampaigns(req.user.id, req.user.isPlatformAdmin || false, filters);
  }

  @Get(':id')
  async getCampaign(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    return this.campaignsService.getCampaign(req.user.id, req.user.isPlatformAdmin || false, id);
  }

  @Get(':id/analytics')
  async getCampaignAnalytics(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    return this.campaignsService.getCampaignAnalytics(req.user.id, req.user.isPlatformAdmin || false, id);
  }

  @Patch(':id')
  async updateCampaign(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateCampaignDto,
  ) {
    return this.campaignsService.updateCampaign(req.user.id, req.user.isPlatformAdmin || false, id, dto);
  }

  @Delete(':id')
  async deleteCampaign(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    return this.campaignsService.deleteCampaign(req.user.id, req.user.isPlatformAdmin || false, id);
  }

  @Post(':id/send')
  async sendCampaign(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    // Get campaign to verify permissions
    await this.campaignsService.getCampaign(req.user.id, req.user.isPlatformAdmin || false, id);

    // Execute the campaign
    const result = await this.campaignExecutionService.executeCampaign(id);
    return result;
  }

  @Post(':id/schedule')
  async scheduleCampaign(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: ScheduleCampaignDto,
  ) {
    return this.campaignsService.scheduleCampaign(
      req.user.id,
      req.user.isPlatformAdmin || false,
      id,
      new Date(dto.scheduledFor),
    );
  }

  @Post(':id/cancel')
  async cancelCampaign(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    return this.campaignsService.cancelCampaign(req.user.id, req.user.isPlatformAdmin || false, id);
  }

  @Post('check-prospects')
  async checkProspectsEligibility(
    @Req() req: any,
    @Body() dto: CheckProspectsDto,
  ) {
    const validation = await this.campaignsService.validateRecipients(dto.prospectContactIds);
    return {
      eligible: validation.eligible,
      ineligible: validation.ineligible,
      eligibleCount: validation.eligible.length,
      ineligibleCount: validation.ineligible.length,
    };
  }
}
