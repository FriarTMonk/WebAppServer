import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  Organization,
  CreateOrganizationDto,
  UpdateOrganizationDto,
  OrganizationMember,
  OrganizationRole,
  Permission,
  CreateRoleDto,
  UpdateRoleDto,
  InviteMemberDto,
  OrganizationInvitation,
} from '@mychristiancounselor/shared';
import { randomBytes } from 'crypto';

@Injectable()
export class OrganizationService {
  private readonly INVITATION_EXPIRY_DAYS = 7;

  constructor(private prisma: PrismaService) {}

  // ===== ORGANIZATION CRUD =====

  async createOrganization(userId: string, dto: CreateOrganizationDto): Promise<Organization> {
    // Create organization with trial license
    const organization = await this.prisma.organization.create({
      data: {
        name: dto.name,
        description: dto.description,
        licenseStatus: 'trial',
        maxMembers: 10, // Trial default
      },
    });

    // Create system roles: Owner, Admin, Counselor, Member
    const ownerRole = await this.createSystemRole(
      organization.id,
      'Owner',
      'Full access to manage organization',
      [
        Permission.MANAGE_ORGANIZATION,
        Permission.MANAGE_MEMBERS,
        Permission.INVITE_MEMBERS,
        Permission.REMOVE_MEMBERS,
        Permission.VIEW_MEMBERS,
        Permission.MANAGE_ROLES,
        Permission.ASSIGN_ROLES,
        Permission.VIEW_MEMBER_CONVERSATIONS,
        Permission.VIEW_ANALYTICS,
        Permission.EXPORT_DATA,
        Permission.MANAGE_BILLING,
        Permission.VIEW_BILLING,
      ]
    );

    await this.createSystemRole(
      organization.id,
      'Admin',
      'Can manage members and roles',
      [
        Permission.VIEW_ORGANIZATION,
        Permission.MANAGE_MEMBERS,
        Permission.INVITE_MEMBERS,
        Permission.REMOVE_MEMBERS,
        Permission.VIEW_MEMBERS,
        Permission.ASSIGN_ROLES,
        Permission.VIEW_MEMBER_CONVERSATIONS,
        Permission.VIEW_ANALYTICS,
        Permission.EXPORT_DATA,
        Permission.VIEW_BILLING,
      ]
    );

    await this.createSystemRole(
      organization.id,
      'Counselor',
      'Can view member conversations and analytics',
      [
        Permission.VIEW_ORGANIZATION,
        Permission.VIEW_MEMBERS,
        Permission.VIEW_MEMBER_CONVERSATIONS,
        Permission.VIEW_ANALYTICS,
      ]
    );

    await this.createSystemRole(
      organization.id,
      'Member',
      'Basic member access',
      [
        Permission.VIEW_ORGANIZATION,
      ]
    );

    // Add creator as owner
    await this.prisma.organizationMember.create({
      data: {
        organizationId: organization.id,
        userId,
        roleId: ownerRole.id,
      },
    });

    return organization;
  }

  async getOrganization(organizationId: string): Promise<Organization> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    return org;
  }

  async updateOrganization(
    organizationId: string,
    userId: string,
    dto: UpdateOrganizationDto
  ): Promise<Organization> {
    // Check permission
    await this.requirePermission(organizationId, userId, Permission.MANAGE_ORGANIZATION);

    return this.prisma.organization.update({
      where: { id: organizationId },
      data: dto,
    });
  }

  async getUserOrganizations(userId: string): Promise<Organization[]> {
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId },
      include: { organization: true },
    });

    return memberships.map(m => m.organization);
  }

  // ===== ROLE MANAGEMENT =====

  private async createSystemRole(
    organizationId: string,
    name: string,
    description: string,
    permissions: Permission[]
  ): Promise<OrganizationRole> {
    return this.prisma.organizationRole.create({
      data: {
        organizationId,
        name,
        description,
        isSystemRole: true,
        permissions: permissions,
      },
    }) as any;
  }

  async createCustomRole(
    organizationId: string,
    userId: string,
    dto: CreateRoleDto
  ): Promise<OrganizationRole> {
    // Check permission
    await this.requirePermission(organizationId, userId, Permission.MANAGE_ROLES);

    // Don't allow duplicate role names
    const existing = await this.prisma.organizationRole.findUnique({
      where: {
        organizationId_name: {
          organizationId,
          name: dto.name,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Role with this name already exists');
    }

    return this.prisma.organizationRole.create({
      data: {
        organizationId,
        name: dto.name,
        description: dto.description,
        isSystemRole: false,
        permissions: dto.permissions,
      },
    }) as any;
  }

  async updateRole(
    roleId: string,
    organizationId: string,
    userId: string,
    dto: UpdateRoleDto
  ): Promise<OrganizationRole> {
    // Check permission
    await this.requirePermission(organizationId, userId, Permission.MANAGE_ROLES);

    // Get role
    const role = await this.prisma.organizationRole.findUnique({
      where: { id: roleId },
    });

    if (!role || role.organizationId !== organizationId) {
      throw new NotFoundException('Role not found');
    }

    // Cannot modify system roles
    if (role.isSystemRole) {
      throw new ForbiddenException('Cannot modify system roles');
    }

    return this.prisma.organizationRole.update({
      where: { id: roleId },
      data: dto,
    }) as any;
  }

  async getOrganizationRoles(organizationId: string): Promise<OrganizationRole[]> {
    return this.prisma.organizationRole.findMany({
      where: { organizationId },
      orderBy: [
        { isSystemRole: 'desc' },
        { name: 'asc' },
      ],
    }) as any;
  }

  // ===== MEMBER MANAGEMENT =====

  async getOrganizationMembers(organizationId: string, userId: string): Promise<OrganizationMember[]> {
    // Check permission
    await this.requirePermission(organizationId, userId, Permission.VIEW_MEMBERS);

    return this.prisma.organizationMember.findMany({
      where: { organizationId },
      include: {
        user: true,
        role: true,
      },
    }) as any;
  }

  async updateMemberRole(
    memberId: string,
    organizationId: string,
    userId: string,
    newRoleId: string
  ): Promise<OrganizationMember> {
    // Check permission
    await this.requirePermission(organizationId, userId, Permission.ASSIGN_ROLES);

    // Verify member belongs to organization
    const member = await this.prisma.organizationMember.findUnique({
      where: { id: memberId },
    });

    if (!member || member.organizationId !== organizationId) {
      throw new NotFoundException('Member not found');
    }

    // Verify role belongs to organization
    const role = await this.prisma.organizationRole.findUnique({
      where: { id: newRoleId },
    });

    if (!role || role.organizationId !== organizationId) {
      throw new NotFoundException('Role not found');
    }

    return this.prisma.organizationMember.update({
      where: { id: memberId },
      data: { roleId: newRoleId },
      include: {
        user: true,
        role: true,
      },
    }) as any;
  }

  async removeMember(
    memberId: string,
    organizationId: string,
    userId: string
  ): Promise<void> {
    // Check permission
    await this.requirePermission(organizationId, userId, Permission.REMOVE_MEMBERS);

    // Verify member belongs to organization
    const member = await this.prisma.organizationMember.findUnique({
      where: { id: memberId },
    });

    if (!member || member.organizationId !== organizationId) {
      throw new NotFoundException('Member not found');
    }

    // Cannot remove yourself if you're the last owner
    if (member.userId === userId) {
      const ownerRole = await this.prisma.organizationRole.findUnique({
        where: {
          organizationId_name: {
            organizationId,
            name: 'Owner',
          },
        },
      });

      if (ownerRole) {
        const ownerCount = await this.prisma.organizationMember.count({
          where: {
            organizationId,
            roleId: ownerRole.id,
          },
        });

        if (ownerCount === 1) {
          throw new BadRequestException('Cannot remove the last owner');
        }
      }
    }

    await this.prisma.organizationMember.delete({
      where: { id: memberId },
    });
  }

  // ===== INVITATIONS =====

  async inviteMember(
    organizationId: string,
    userId: string,
    dto: InviteMemberDto
  ): Promise<OrganizationInvitation> {
    // Check permission
    await this.requirePermission(organizationId, userId, Permission.INVITE_MEMBERS);

    // Check member limit
    const org = await this.getOrganization(organizationId);
    const currentMemberCount = await this.prisma.organizationMember.count({
      where: { organizationId },
    });

    if (currentMemberCount >= org.maxMembers) {
      throw new BadRequestException('Organization has reached member limit');
    }

    // Check if user is already a member
    const existingMember = await this.prisma.organizationMember.findFirst({
      where: {
        organizationId,
        user: { email: dto.email.toLowerCase() },
      },
    });

    if (existingMember) {
      throw new BadRequestException('User is already a member');
    }

    // Check if there's already a pending invitation
    const existingInvitation = await this.prisma.organizationInvitation.findFirst({
      where: {
        organizationId,
        email: dto.email.toLowerCase(),
        status: 'pending',
      },
    });

    if (existingInvitation) {
      throw new BadRequestException('Invitation already sent');
    }

    // Verify role exists
    const role = await this.prisma.organizationRole.findUnique({
      where: { id: dto.roleId },
    });

    if (!role || role.organizationId !== organizationId) {
      throw new NotFoundException('Role not found');
    }

    // Create invitation
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.INVITATION_EXPIRY_DAYS);

    const invitation = await this.prisma.organizationInvitation.create({
      data: {
        organizationId,
        email: dto.email.toLowerCase(),
        roleId: dto.roleId,
        invitedById: userId,
        token,
        expiresAt,
      },
      include: {
        organization: true,
        invitedBy: true,
      },
    });

    // TODO: Send invitation email (Task for later)

    return invitation as any;
  }

  async acceptInvitation(token: string, userId: string): Promise<OrganizationMember> {
    // Find invitation
    const invitation = await this.prisma.organizationInvitation.findUnique({
      where: { token },
      include: { organization: true },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== 'pending') {
      throw new BadRequestException('Invitation already used or expired');
    }

    if (invitation.expiresAt < new Date()) {
      await this.prisma.organizationInvitation.update({
        where: { id: invitation.id },
        data: { status: 'expired' },
      });
      throw new BadRequestException('Invitation expired');
    }

    // Verify user email matches invitation
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.email !== invitation.email) {
      throw new ForbiddenException('Invitation not for this user');
    }

    // Check member limit
    const currentMemberCount = await this.prisma.organizationMember.count({
      where: { organizationId: invitation.organizationId },
    });

    if (currentMemberCount >= invitation.organization.maxMembers) {
      throw new BadRequestException('Organization has reached member limit');
    }

    // Add user to organization
    const member = await this.prisma.organizationMember.create({
      data: {
        organizationId: invitation.organizationId,
        userId,
        roleId: invitation.roleId,
      },
      include: {
        user: true,
        role: true,
      },
    });

    // Mark invitation as accepted
    await this.prisma.organizationInvitation.update({
      where: { id: invitation.id },
      data: {
        status: 'accepted',
        acceptedById: userId,
      },
    });

    return member as any;
  }

  async getPendingInvitations(organizationId: string, userId: string): Promise<OrganizationInvitation[]> {
    // Check permission
    await this.requirePermission(organizationId, userId, Permission.VIEW_MEMBERS);

    return this.prisma.organizationInvitation.findMany({
      where: {
        organizationId,
        status: 'pending',
        expiresAt: { gt: new Date() },
      },
      include: {
        invitedBy: true,
      },
    }) as any;
  }

  // ===== PERMISSION CHECKING =====

  async hasPermission(
    organizationId: string,
    userId: string,
    permission: Permission
  ): Promise<boolean> {
    const member = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
      include: { role: true },
    });

    if (!member) {
      return false;
    }

    // Ensure permissions is an array (Prisma JSON fields might need parsing)
    let permissions = member.role.permissions as any;
    if (typeof permissions === 'string') {
      permissions = JSON.parse(permissions);
    }
    if (!Array.isArray(permissions)) {
      permissions = [];
    }
    return (permissions as Permission[]).includes(permission);
  }

  async requirePermission(
    organizationId: string,
    userId: string,
    permission: Permission
  ): Promise<void> {
    const hasPermission = await this.hasPermission(organizationId, userId, permission);

    if (!hasPermission) {
      throw new ForbiddenException(`Missing permission: ${permission}`);
    }
  }

  async getUserPermissions(organizationId: string, userId: string): Promise<Permission[]> {
    const member = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
      include: { role: true },
    });

    if (!member) {
      return [];
    }

    return member.role.permissions as Permission[];
  }
}
