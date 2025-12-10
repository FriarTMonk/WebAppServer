import { Controller, Get, Put, Body, UseGuards, Request, Query, Patch, Delete, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProfileService } from './profile.service';
import { UpdateProfileDto, ChangePasswordDto } from './dto/update-profile.dto';

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  async getProfile(@Request() req) {
    return this.profileService.getProfile(req.user.id);
  }

  @Put()
  async updateProfile(@Request() req, @Body() updateProfileDto: UpdateProfileDto) {
    return this.profileService.updateProfile(req.user.id, updateProfileDto);
  }

  @Put('password')
  async changePassword(@Request() req, @Body() changePasswordDto: ChangePasswordDto) {
    return this.profileService.changePassword(req.user.id, changePasswordDto);
  }

  @Get('organizations')
  async getUserOrganizations(@Request() req) {
    return this.profileService.getUserOrganizations(req.user.id);
  }

  @Get('counselor-assignments')
  async getCounselorAssignments(@Request() req) {
    return this.profileService.getCounselorAssignments(req.user.id);
  }

  @Get('history')
  async getHistory(
    @Request() req,
    @Query('search') search?: string,
    @Query('topics') topics?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('status') status?: 'active' | 'completed',
  ) {
    const topicsArray = topics ? topics.split(',') : undefined;
    const dateFromParsed = dateFrom ? new Date(dateFrom) : undefined;
    const dateToParsed = dateTo ? new Date(dateTo) : undefined;

    return this.profileService.getHistory(
      req.user.id,
      search,
      topicsArray,
      dateFromParsed,
      dateToParsed,
      status || 'active',
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch('conversations/:sessionId/archive')
  async archiveConversation(@Request() req, @Param('sessionId') sessionId: string) {
    return this.profileService.archiveConversation(req.user.id, sessionId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('conversations/:sessionId/restore')
  async restoreConversation(@Request() req, @Param('sessionId') sessionId: string) {
    return this.profileService.restoreConversation(req.user.id, sessionId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('conversations/:sessionId')
  async deleteConversation(@Request() req, @Param('sessionId') sessionId: string) {
    await this.profileService.hardDeleteConversation(req.user.id, sessionId);
    return { message: 'Conversation deleted' };
  }

  /**
   * Delete user account (GDPR compliance)
   *
   * Requires password confirmation for security.
   * Deletes all user data permanently.
   */
  @UseGuards(JwtAuthGuard)
  @Delete()
  async deleteAccount(@Request() req, @Body() body: { password: string }) {
    return this.profileService.deleteAccount(req.user.id, body.password);
  }
}
