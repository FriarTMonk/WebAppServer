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
  ) {
    // Parse pagination parameters
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;

    // Calculate skip based on page number
    const skip = (pageNum - 1) * limitNum;

    return this.supportService.getUserTickets(req.user.id, {
      skip,
      take: limitNum,
    });
  }
}
