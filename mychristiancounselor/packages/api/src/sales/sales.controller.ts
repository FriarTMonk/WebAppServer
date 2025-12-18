import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ForbiddenException,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SalesService } from './sales.service';
import { SalesPerformanceService } from './sales-performance.service';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { AssignRepDto } from './dto/assign-rep.dto';
import { RecordActivityDto } from './dto/record-activity.dto';
import { MarkWonDto } from './dto/mark-won.dto';
import { MarkLostDto } from './dto/mark-lost.dto';
import { SalesStage } from '@prisma/client';

@Controller('sales')
@UseGuards(JwtAuthGuard)
export class SalesController {
  constructor(
    private readonly salesService: SalesService,
    private readonly salesPerformanceService: SalesPerformanceService,
  ) {}

  @Post('opportunities')
  async createOpportunity(@Req() req: any, @Body() dto: CreateOpportunityDto) {
    return this.salesService.createOpportunity(req.user.id, dto);
  }

  @Get('opportunities')
  async getUserOpportunities(
    @Req() req: any,
    @Query('stage') stage?: SalesStage,
    @Query('leadSource') leadSource?: string,
    @Query('sortBy') sortBy?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 50;

    return this.salesService.getUserOpportunities(req.user.id, {
      stage,
      leadSource,
      sortBy,
      skip: (pageNum - 1) * pageSizeNum,
      take: pageSizeNum,
    });
  }

  @Get('opportunities/:id')
  async getOpportunity(@Req() req: any, @Param('id') id: string) {
    return this.salesService.getOpportunity(id, req.user.id);
  }

  @Get('admin/queue')
  async getAdminQueue(
    @Req() req: any,
    @Query('stage') stage?: SalesStage,
    @Query('leadSource') leadSource?: string,
    @Query('assignmentFilter') assignmentFilter?: 'all' | 'unassigned' | 'assigned',
    @Query('sortBy') sortBy?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 50;

    return this.salesService.getAdminQueue(req.user.id, {
      stage,
      leadSource,
      assignmentFilter,
      sortBy,
      skip: (pageNum - 1) * pageSizeNum,
      take: pageSizeNum,
    });
  }

  @Post('opportunities/:id/assign')
  async assignToRep(@Req() req: any, @Param('id') id: string, @Body() dto: AssignRepDto) {
    return this.salesService.assignToRep(id, req.user.id, dto);
  }

  @Post('opportunities/:id/stage')
  async updateStage(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateStageDto) {
    return this.salesService.updateStage(id, req.user.id, dto);
  }

  @Post('opportunities/:id/activity')
  async recordActivity(@Req() req: any, @Param('id') id: string, @Body() dto: RecordActivityDto) {
    return this.salesService.recordActivity(id, req.user.id, dto);
  }

  @Post('opportunities/:id/won')
  async markWon(@Req() req: any, @Param('id') id: string, @Body() dto: MarkWonDto) {
    return this.salesService.markWon(id, req.user.id, dto);
  }

  @Post('opportunities/:id/lost')
  async markLost(@Req() req: any, @Param('id') id: string, @Body() dto: MarkLostDto) {
    return this.salesService.markLost(id, req.user.id, dto);
  }

  @Get('metrics')
  async getSalesMetrics(@Req() req: any) {
    // Check if user is admin
    if (!req.user.isPlatformAdmin) {
      throw new ForbiddenException('Only platform admins can view sales metrics');
    }

    return this.salesPerformanceService.getSalesMetrics();
  }

  @Get('rep-performance/:repId')
  async getRepPerformance(
    @Req() req: any,
    @Param('repId') repId: string,
    @Query('days', new ParseIntPipe({ optional: true })) days?: number,
  ) {
    // Check if user is admin or viewing their own performance
    if (!req.user.isPlatformAdmin && req.user.id !== repId) {
      throw new ForbiddenException('You can only view your own performance');
    }

    return this.salesPerformanceService.getRepPerformance(repId, days || 90);
  }
}
