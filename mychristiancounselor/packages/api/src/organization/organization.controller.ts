import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  CreateRoleDto,
  UpdateRoleDto,
  InviteMemberDto,
  AcceptInvitationDto,
  UpdateMemberRoleDto,
} from './dto';
import {
  Organization,
  OrganizationMember,
  OrganizationRole,
  OrganizationInvitation,
} from '@mychristiancounselor/shared';

@Controller('organizations')
export class OrganizationController {
  constructor(private organizationService: OrganizationService) {}

  // ===== ORGANIZATION MANAGEMENT =====

  @Post()
  async createOrganization(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateOrganizationDto
  ): Promise<Organization> {
    return this.organizationService.createOrganization(userId, dto);
  }

  @Get()
  async getUserOrganizations(
    @CurrentUser('id') userId: string
  ): Promise<Organization[]> {
    return this.organizationService.getUserOrganizations(userId);
  }

  @Get(':id')
  async getOrganization(
    @Param('id') id: string
  ): Promise<Organization> {
    return this.organizationService.getOrganization(id);
  }

  @Put(':id')
  async updateOrganization(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateOrganizationDto
  ): Promise<Organization> {
    return this.organizationService.updateOrganization(id, userId, dto);
  }

  // ===== ROLE MANAGEMENT =====

  @Get(':id/roles')
  async getOrganizationRoles(
    @Param('id') organizationId: string
  ): Promise<OrganizationRole[]> {
    return this.organizationService.getOrganizationRoles(organizationId);
  }

  @Post(':id/roles')
  async createCustomRole(
    @Param('id') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateRoleDto
  ): Promise<OrganizationRole> {
    return this.organizationService.createCustomRole(organizationId, userId, dto);
  }

  @Put(':id/roles/:roleId')
  async updateRole(
    @Param('id') organizationId: string,
    @Param('roleId') roleId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateRoleDto
  ): Promise<OrganizationRole> {
    return this.organizationService.updateRole(roleId, organizationId, userId, dto);
  }

  // ===== MEMBER MANAGEMENT =====

  @Get(':id/members')
  async getOrganizationMembers(
    @Param('id') organizationId: string,
    @CurrentUser('id') userId: string
  ): Promise<OrganizationMember[]> {
    return this.organizationService.getOrganizationMembers(organizationId, userId);
  }

  @Put(':id/members/:memberId/role')
  async updateMemberRole(
    @Param('id') organizationId: string,
    @Param('memberId') memberId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateMemberRoleDto
  ): Promise<OrganizationMember> {
    return this.organizationService.updateMemberRole(
      memberId,
      organizationId,
      userId,
      dto.roleId
    );
  }

  @Delete(':id/members/:memberId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @Param('id') organizationId: string,
    @Param('memberId') memberId: string,
    @CurrentUser('id') userId: string
  ): Promise<void> {
    await this.organizationService.removeMember(memberId, organizationId, userId);
  }

  // ===== INVITATIONS =====

  @Post(':id/invitations')
  async inviteMember(
    @Param('id') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: InviteMemberDto
  ): Promise<OrganizationInvitation> {
    return this.organizationService.inviteMember(organizationId, userId, dto);
  }

  @Get(':id/invitations')
  async getPendingInvitations(
    @Param('id') organizationId: string,
    @CurrentUser('id') userId: string
  ): Promise<OrganizationInvitation[]> {
    return this.organizationService.getPendingInvitations(organizationId, userId);
  }

  @Post('invitations/accept')
  async acceptInvitation(
    @CurrentUser('id') userId: string,
    @Body() dto: AcceptInvitationDto
  ): Promise<OrganizationMember> {
    return this.organizationService.acceptInvitation(dto.token, userId);
  }

  // ===== PERMISSIONS =====

  @Get(':id/permissions')
  async getUserPermissions(
    @Param('id') organizationId: string,
    @CurrentUser('id') userId: string
  ): Promise<string[]> {
    return this.organizationService.getUserPermissions(organizationId, userId);
  }
}
