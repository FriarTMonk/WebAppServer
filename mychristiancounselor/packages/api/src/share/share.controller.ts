import { Controller, Post, Get, Delete, Patch, Body, Param, Request, UseGuards, HttpCode } from '@nestjs/common';
import { ShareService } from './share.service';
import { CreateShareRequest } from '@mychristiancounselor/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('share')
@UseGuards(JwtAuthGuard)
export class ShareController {
  constructor(private shareService: ShareService) {}

  /**
   * Create a new share link
   * POST /share
   */
  @Post()
  async createShare(
    @Request() req,
    @Body() createShareDto: CreateShareRequest
  ) {
    const userId = req.user.id;
    return this.shareService.createShare(userId, createShareDto);
  }

  /**
   * Get all shares created by current user
   * GET /share
   */
  @Get()
  async getUserShares(@Request() req) {
    const userId = req.user.id;
    return this.shareService.getUserShares(userId);
  }

  /**
   * Get all shares accessed by current user
   * GET /share/accessed/list
   * IMPORTANT: This must come before the :token route
   */
  @Get('accessed/list')
  async getAccessedShares(@Request() req) {
    const userId = req.user.id;
    return this.shareService.getAccessedShares(userId);
  }

  /**
   * Dismiss/archive a share for current user
   * PATCH /share/accessed/:shareId/dismiss
   * IMPORTANT: This must come before the :token route
   */
  @Patch('accessed/:shareId/dismiss')
  @HttpCode(200)
  async dismissShare(
    @Param('shareId') shareId: string,
    @Request() req
  ) {
    const userId = req.user.id;
    return this.shareService.dismissShare(userId, shareId);
  }

  /**
   * Get share information and validate access
   * GET /share/:token
   * IMPORTANT: This must come after all specific routes
   */
  @Get(':token')
  async getShare(
    @Param('token') token: string,
    @Request() req
  ) {
    const userId = req.user.id;
    return this.shareService.validateShare(token, userId);
  }

  /**
   * Delete a share link
   * DELETE /share/:id
   * IMPORTANT: This must come after all specific routes
   */
  @Delete(':id')
  @HttpCode(200)
  async deleteShare(
    @Param('id') id: string,
    @Request() req
  ) {
    const userId = req.user.id;
    return this.shareService.deleteShare(userId, id);
  }
}
