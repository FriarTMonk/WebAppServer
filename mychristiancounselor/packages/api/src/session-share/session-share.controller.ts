import { Controller, Post, Get, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { SessionShareService } from './session-share.service';
import { CreateShareDto } from './dto/create-share.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('counsel/share')
export class SessionShareController {
  constructor(private readonly sessionShareService: SessionShareService) {}

  @Post(':sessionId')
  @UseGuards(JwtAuthGuard)
  async createShare(
    @Param('sessionId') sessionId: string,
    @Request() req,
    @Body() createShareDto: CreateShareDto,
  ) {
    return this.sessionShareService.createShare(sessionId, req.user.userId, createShareDto);
  }

  @Get(':sessionId/list')
  @UseGuards(JwtAuthGuard)
  async listShares(@Param('sessionId') sessionId: string, @Request() req) {
    return this.sessionShareService.listShares(sessionId, req.user.userId);
  }

  @Delete(':shareId')
  @UseGuards(JwtAuthGuard)
  async revokeShare(@Param('shareId') shareId: string, @Request() req) {
    await this.sessionShareService.revokeShare(shareId, req.user.userId);
    return { message: 'Share revoked successfully' };
  }
}

// Public endpoint for viewing shared sessions (no auth required)
@Controller('counsel/shared')
export class SharedSessionController {
  constructor(private readonly sessionShareService: SessionShareService) {}

  @Get(':shareToken')
  async getSharedSession(@Param('shareToken') shareToken: string) {
    return this.sessionShareService.getSharedSession(shareToken);
  }
}
