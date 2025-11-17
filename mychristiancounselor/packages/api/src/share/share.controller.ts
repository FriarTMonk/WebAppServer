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
   * Get share information and validate access
   * GET /share/:token
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
   * Get all shares created by current user
   * GET /share
   */
  @Get()
  async getUserShares(@Request() req) {
    const userId = req.user.id;
    return this.shareService.getUserShares(userId);
  }

  /**
   * Delete a share link
   * DELETE /share/:id
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

  /**
   * Get all shares accessed by current user
   * GET /share/accessed/list
   */
  @Get('accessed/list')
  async getAccessedShares(@Request() req) {
    const userId = req.user.id;
    return this.shareService.getAccessedShares(userId);
  }

  /**
   * Dismiss/archive a share for current user
   * PATCH /share/accessed/:shareId/dismiss
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
}
