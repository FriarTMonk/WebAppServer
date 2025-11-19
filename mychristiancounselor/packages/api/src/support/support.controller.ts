import { Controller, Get, Post, Body, Param, Request, UseGuards, Query } from '@nestjs/common';
import { SupportService } from './support.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateTicketDto } from './dto/create-ticket.dto';

@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @UseGuards(JwtAuthGuard)
  @Post('tickets')
  async createTicket(@Request() req, @Body() dto: CreateTicketDto) {
    return this.supportService.createTicket(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('tickets')
  async getUserTickets(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('category') category?: string,
  ) {
    // Validate and sanitize pagination
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    // Parse filter parameters
    const statusFilter = status?.split(',').filter(Boolean) || [];
    const priorityFilter = priority?.split(',').filter(Boolean) || [];
    const categoryFilter = category?.split(',').filter(Boolean) || [];

    return this.supportService.getUserTickets(req.user.id, {
      skip,
      take: limitNum,
      status: statusFilter.length > 0 ? statusFilter : undefined,
      priority: priorityFilter.length > 0 ? priorityFilter : undefined,
      category: categoryFilter.length > 0 ? categoryFilter : undefined,
    });
  }
}
