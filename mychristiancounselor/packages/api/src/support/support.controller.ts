import { Controller, Get, Post, Body, Param, Request, UseGuards, Query, Delete } from '@nestjs/common';
import { SupportService } from './support.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { ReplyToTicketDto } from './dto/reply-to-ticket.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { LinkTicketsDto } from './dto/link-tickets.dto';

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

  @UseGuards(JwtAuthGuard)
  @Post('tickets/:ticketId/reply')
  async replyToTicket(
    @Request() req,
    @Param('ticketId') ticketId: string,
    @Body() dto: ReplyToTicketDto,
  ) {
    return this.supportService.replyToTicket(ticketId, req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/queue')
  async getAdminQueue(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('category') category?: string,
    @Query('assignedToId') assignedToId?: string,
  ) {
    // Validate and sanitize pagination
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    // Parse filter parameters
    const statusFilter = status?.split(',').filter(Boolean) || [];
    const priorityFilter = priority?.split(',').filter(Boolean) || [];
    const categoryFilter = category?.split(',').filter(Boolean) || [];

    return this.supportService.getAdminQueue(req.user.id, {
      skip,
      take: limitNum,
      status: statusFilter.length > 0 ? statusFilter : undefined,
      priority: priorityFilter.length > 0 ? priorityFilter : undefined,
      category: categoryFilter.length > 0 ? categoryFilter : undefined,
      assignedToId: assignedToId || undefined,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('tickets/:ticketId/assign')
  async assignTicket(
    @Request() req,
    @Param('ticketId') ticketId: string,
    @Body() dto: AssignTicketDto,
  ) {
    return this.supportService.assignTicket(ticketId, req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('tickets/:ticketId/resolve')
  async resolveTicket(
    @Request() req,
    @Param('ticketId') ticketId: string,
  ) {
    return this.supportService.resolveTicket(ticketId, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('tickets/:ticketId/close')
  async closeTicket(
    @Request() req,
    @Param('ticketId') ticketId: string,
  ) {
    return this.supportService.closeTicket(ticketId, req.user.id);
  }

  /**
   * Get similar tickets (active or historical)
   */
  @UseGuards(JwtAuthGuard)
  @Get('tickets/:ticketId/similar')
  async getSimilarTickets(
    @Param('ticketId') ticketId: string,
    @Query('type') type: string,
    @Request() req
  ) {
    const matchType = type === 'historical' ? 'historical' : 'active';
    return this.supportService.getSimilarTickets(
      ticketId,
      req.user.id,
      matchType
    );
  }

  /**
   * Link two tickets together
   */
  @UseGuards(JwtAuthGuard)
  @Post('tickets/:ticketId/link')
  async linkTickets(
    @Param('ticketId') ticketId: string,
    @Body() dto: LinkTicketsDto,
    @Request() req
  ) {
    return this.supportService.linkTickets(ticketId, dto, req.user.id);
  }

  /**
   * Dismiss a similarity suggestion
   */
  @UseGuards(JwtAuthGuard)
  @Delete('similarity/:similarityId')
  async dismissSuggestion(
    @Param('similarityId') similarityId: string,
    @Request() req
  ) {
    await this.supportService.dismissSuggestion(similarityId, req.user.id);
    return { message: 'Suggestion dismissed' };
  }
}
