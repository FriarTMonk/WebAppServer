import { Controller, Get, Post, Body, Param, Request, UseGuards } from '@nestjs/common';
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
}
