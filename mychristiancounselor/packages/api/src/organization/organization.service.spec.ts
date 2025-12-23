import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationService } from './organization.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { Permission } from '@mychristiancounselor/shared';
import { createEmailServiceMock } from '../testing';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';

describe('OrganizationService', () => {
  let service: OrganizationService;
  let prisma: PrismaService;
  let emailService: EmailService;
  let subscriptionService: SubscriptionService;

  const SYSTEM_ORG_ID = '00000000-0000-0000-0000-000000000001';

  const mockPlatformOwnerRole = {
    id: 'platform-role-owner',
    organizationId: SYSTEM_ORG_ID,
    name: 'Owner',
    description: 'Full access to manage organization',
    isSystemRole: true,
    permissions: [
      Permission.MANAGE_ORGANIZATION,
      Permission.MANAGE_ROLES,
      Permission.ASSIGN_ROLES,
      Permission.VIEW_MEMBERS,
      Permission.INVITE_MEMBERS,
      Permission.REMOVE_MEMBERS,
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockOrganization = {
    id: 'org-123',
    name: 'Test Church',
    description: 'A test church',
    licenseType: null,
    licenseStatus: 'active',
    licenseExpiresAt: null,
    maxMembers: 50,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    passwordHash: 'hashed',
    isActive: true,
    emailVerified: true,
    verificationToken: null,
    resetToken: null,
    resetTokenExpiry: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMember = {
    id: 'member-123',
    organizationId: mockOrganization.id,
    userId: mockUser.id,
    roleId: mockPlatformOwnerRole.id,
    joinedAt: new Date(),
    user: mockUser,
    role: mockPlatformOwnerRole,
  };

  beforeEach(async () => {
    const mockPrismaService = {
      organization: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      organizationRole: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      organizationMember: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        delete: jest.fn(),
        update: jest.fn(),
      },
      organizationInvitation: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue(mockUser),
      },
      session: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      message: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: EmailService,
          useValue: {
            ...createEmailServiceMock(),
            sendOrgInvitationEmail: jest.fn().mockResolvedValue({ success: true }),
          },
        },
        {
          provide: SubscriptionService,
          useValue: {
            getSubscriptionStatus: jest.fn(),
            hasFeatureAccess: jest.fn(),
            suspendSubscription: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<OrganizationService>(OrganizationService);
    prisma = module.get<PrismaService>(PrismaService);
    emailService = module.get<EmailService>(EmailService);
    subscriptionService = module.get<SubscriptionService>(SubscriptionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createOrganization', () => {
    it('should create organization and add creator as owner using platform role', async () => {
      const userId = 'user-123';
      const dto = { name: 'Test Church', description: 'A test church' };

      jest.spyOn(prisma.organization, 'create').mockResolvedValue(mockOrganization);
      jest.spyOn(prisma.organizationRole, 'findUnique').mockResolvedValue(mockPlatformOwnerRole); // getPlatformRole call
      jest.spyOn(prisma.organizationMember, 'create').mockResolvedValue(mockMember);

      const result = await service.createOrganization(userId, dto);

      expect(prisma.organization.create).toHaveBeenCalledWith({
        data: {
          name: dto.name,
          description: dto.description,
          licenseStatus: 'trial',
          maxMembers: 10,
        },
      });
      expect(prisma.organizationRole.findUnique).toHaveBeenCalled();
      expect(prisma.organizationMember.create).toHaveBeenCalled();
      expect(result.name).toBe(dto.name);
      expect(result.licenseStatus).toBe('active');
    });
  });

  describe('getOrganization', () => {
    it('should return organization by ID', async () => {
      jest.spyOn(prisma.organization, 'findUnique').mockResolvedValue(mockOrganization);

      const result = await service.getOrganization(mockOrganization.id);

      expect(result).toEqual(mockOrganization);
      expect(prisma.organization.findUnique).toHaveBeenCalledWith({
        where: { id: mockOrganization.id },
      });
    });

    it('should throw NotFoundException when organization not found', async () => {
      jest.spyOn(prisma.organization, 'findUnique').mockResolvedValue(null);

      await expect(service.getOrganization('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateOrganization', () => {
    it('should update organization with valid permissions', async () => {
      const dto = { name: 'Updated Church', description: 'Updated description' };
      jest.spyOn(prisma.organizationMember, 'findUnique').mockResolvedValue(mockMember);
      jest.spyOn(prisma.organization, 'update').mockResolvedValue({ ...mockOrganization, ...dto });

      const result = await service.updateOrganization(mockOrganization.id, mockUser.id, dto);

      expect(result.name).toBe(dto.name);
      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: mockOrganization.id },
        data: dto,
      });
    });

    it('should throw ForbiddenException without permission', async () => {
      const dto = { name: 'Updated Church' };
      jest.spyOn(prisma.organizationMember, 'findUnique').mockResolvedValue(null);

      await expect(
        service.updateOrganization(mockOrganization.id, mockUser.id, dto)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getUserOrganizations', () => {
    it('should return all organizations for user', async () => {
      const memberships = [
        { ...mockMember, organization: mockOrganization },
      ];
      jest.spyOn(prisma.organizationMember, 'findMany').mockResolvedValue(memberships);

      const result = await service.getUserOrganizations(mockUser.id);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockOrganization);
    });
  });

  describe('createCustomRole', () => {
    it('should create custom role with valid permissions', async () => {
      const dto = {
        name: 'Custom Role',
        description: 'Test role',
        permissions: [Permission.VIEW_MEMBERS],
      };
      const mockRole = {
        id: 'role-123',
        organizationId: mockOrganization.id,
        ...dto,
        isSystemRole: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.organizationMember, 'findUnique').mockResolvedValue(mockMember);
      jest.spyOn(prisma.organizationRole, 'findUnique').mockResolvedValue(null); // duplicate name check
      jest.spyOn(prisma.organizationRole, 'create').mockResolvedValue(mockRole);

      const result = await service.createCustomRole(mockOrganization.id, mockUser.id, dto);

      expect(result.name).toBe(dto.name);
      expect(result.isSystemRole).toBe(false);
    });

    it('should throw BadRequestException for duplicate role name', async () => {
      const dto = {
        name: 'Owner',
        description: 'Test',
        permissions: [Permission.VIEW_MEMBERS],
      };

      jest.spyOn(prisma.organizationMember, 'findUnique').mockResolvedValue(mockMember);
      jest.spyOn(prisma.organizationRole, 'findUnique').mockResolvedValue(mockPlatformOwnerRole);

      await expect(
        service.createCustomRole(mockOrganization.id, mockUser.id, dto)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateRole', () => {
    it('should update custom role', async () => {
      const roleId = 'custom-role-123';
      const dto = { name: 'Updated Role', description: 'Updated' };
      const customRole = {
        id: roleId,
        organizationId: mockOrganization.id,
        name: 'Custom Role',
        description: 'Test',
        isSystemRole: false,
        permissions: [Permission.VIEW_MEMBERS],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.organizationMember, 'findUnique').mockResolvedValue(mockMember);
      jest.spyOn(prisma.organizationRole, 'findUnique').mockResolvedValue(customRole); // get role to update
      jest.spyOn(prisma.organizationRole, 'update').mockResolvedValue({ ...customRole, ...dto });

      const result = await service.updateRole(roleId, mockOrganization.id, mockUser.id, dto);

      expect(result.name).toBe(dto.name);
    });

    it('should throw ForbiddenException when updating system role', async () => {
      const dto = { name: 'Updated Owner' };
      const systemOrgRole = { ...mockPlatformOwnerRole, organizationId: mockOrganization.id, isSystemRole: true };

      jest.spyOn(prisma.organizationMember, 'findUnique').mockResolvedValue(mockMember);
      jest.spyOn(prisma.organizationRole, 'findUnique').mockResolvedValue(systemOrgRole);

      await expect(
        service.updateRole(mockPlatformOwnerRole.id, mockOrganization.id, mockUser.id, dto)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException for non-existent role', async () => {
      const dto = { name: 'Updated' };

      jest.spyOn(prisma.organizationMember, 'findUnique').mockResolvedValue(mockMember);
      jest.spyOn(prisma.organizationRole, 'findUnique')
        .mockResolvedValueOnce(mockPlatformOwnerRole)
        .mockResolvedValueOnce(null);

      await expect(
        service.updateRole('non-existent', mockOrganization.id, mockUser.id, dto)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getOrganizationRoles', () => {
    it('should return both platform and org-specific roles', async () => {
      const roles = [mockPlatformOwnerRole];
      jest.spyOn(prisma.organizationRole, 'findMany').mockResolvedValue(roles);

      const result = await service.getOrganizationRoles(mockOrganization.id);

      expect(result).toEqual(roles);
      expect(prisma.organizationRole.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { organizationId: mockOrganization.id },
            { organizationId: SYSTEM_ORG_ID },
          ],
        },
        orderBy: [
          { isSystemRole: 'desc' },
          { name: 'asc' },
        ],
      });
    });
  });

  describe('getOrganizationMembers', () => {
    it('should return all members with valid permissions', async () => {
      const members = [mockMember];
      jest.spyOn(prisma.organizationMember, 'findUnique').mockResolvedValue(mockMember);
      jest.spyOn(prisma.organizationMember, 'findMany').mockResolvedValue(members);

      const result = await service.getOrganizationMembers(mockOrganization.id, mockUser.id);

      expect(result).toEqual(members);
    });

    it('should throw ForbiddenException without VIEW_MEMBERS permission', async () => {
      jest.spyOn(prisma.organizationMember, 'findUnique').mockResolvedValue(null);

      await expect(
        service.getOrganizationMembers(mockOrganization.id, mockUser.id)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateMemberRole', () => {
    it('should update member role', async () => {
      const newRoleId = 'new-role-123';
      const updatedMember = { ...mockMember, roleId: newRoleId };

      jest.spyOn(prisma.organizationMember, 'findUnique')
        .mockResolvedValueOnce(mockMember) // permission check
        .mockResolvedValueOnce(mockMember); // member to update
      jest.spyOn(prisma.organizationRole, 'findUnique').mockResolvedValue(mockPlatformOwnerRole); // new role
      jest.spyOn(prisma.organizationMember, 'update').mockResolvedValue(updatedMember);

      const result = await service.updateMemberRole(
        mockMember.id,
        mockOrganization.id,
        mockUser.id,
        newRoleId
      );

      expect(result.roleId).toBe(newRoleId);
    });

    it('should throw NotFoundException for non-existent member', async () => {
      jest.spyOn(prisma.organizationMember, 'findUnique')
        .mockResolvedValueOnce(mockMember)
        .mockResolvedValueOnce(null);

      await expect(
        service.updateMemberRole('non-existent', mockOrganization.id, mockUser.id, 'role-123')
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for non-existent role', async () => {
      jest.spyOn(prisma.organizationMember, 'findUnique')
        .mockResolvedValueOnce(mockMember) // permission check
        .mockResolvedValueOnce(mockMember); // member to update
      jest.spyOn(prisma.organizationRole, 'findUnique').mockResolvedValue(null); // role check

      await expect(
        service.updateMemberRole(mockMember.id, mockOrganization.id, mockUser.id, 'invalid-role')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeMember', () => {
    it('should remove member from organization', async () => {
      const targetMember = {
        ...mockMember,
        id: 'member-456',
        userId: 'other-user-123',
      };

      jest.spyOn(prisma.organizationMember, 'findUnique')
        .mockResolvedValueOnce(mockMember) // permission check
        .mockResolvedValueOnce(targetMember); // member to remove
      jest.spyOn(prisma.organizationMember, 'delete').mockResolvedValue(targetMember);

      await service.removeMember(targetMember.id, mockOrganization.id, mockUser.id);

      expect(prisma.organizationMember.delete).toHaveBeenCalledWith({
        where: { id: targetMember.id },
      });
    });

    it('should throw BadRequestException when removing last owner', async () => {
      jest.spyOn(prisma.organizationMember, 'findUnique')
        .mockResolvedValueOnce(mockMember)
        .mockResolvedValueOnce(mockMember);
      jest.spyOn(prisma.organizationRole, 'findUnique').mockResolvedValue(mockPlatformOwnerRole);
      jest.spyOn(prisma.organizationMember, 'count').mockResolvedValue(1);

      await expect(
        service.removeMember(mockMember.id, mockOrganization.id, mockUser.id)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for non-existent member', async () => {
      jest.spyOn(prisma.organizationMember, 'findUnique')
        .mockResolvedValueOnce(mockMember)
        .mockResolvedValueOnce(null);

      await expect(
        service.removeMember('non-existent', mockOrganization.id, mockUser.id)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('inviteMember', () => {
    it('should create and send invitation', async () => {
      const dto = {
        email: 'newmember@example.com',
        roleId: mockPlatformOwnerRole.id,
      };

      const mockInvitation = {
        id: 'invitation-123',
        organizationId: mockOrganization.id,
        email: dto.email,
        roleId: dto.roleId,
        invitedById: mockUser.id,
        token: 'invite-token',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'pending',
        acceptedById: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        organization: mockOrganization,
        invitedBy: mockUser,
        role: mockPlatformOwnerRole,
      };

      jest.spyOn(prisma.organizationMember, 'findUnique').mockResolvedValue(mockMember);
      jest.spyOn(prisma.organization, 'findUnique').mockResolvedValue(mockOrganization);
      jest.spyOn(prisma.organizationMember, 'count').mockResolvedValue(5);
      jest.spyOn(prisma.organizationMember, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prisma.organizationInvitation, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prisma.organizationRole, 'findUnique').mockResolvedValue(mockPlatformOwnerRole);
      jest.spyOn(prisma.organizationInvitation, 'create').mockResolvedValue(mockInvitation);

      const result = await service.inviteMember(mockOrganization.id, mockUser.id, dto);

      expect(result.email).toBe(dto.email);
      expect(emailService.sendOrgInvitationEmail).toHaveBeenCalled();
    });

    it('should throw BadRequestException when member limit reached', async () => {
      const dto = {
        email: 'newmember@example.com',
        roleId: mockPlatformOwnerRole.id,
      };

      jest.spyOn(prisma.organizationMember, 'findUnique').mockResolvedValue(mockMember);
      jest.spyOn(prisma.organization, 'findUnique').mockResolvedValue(mockOrganization);
      jest.spyOn(prisma.organizationMember, 'count').mockResolvedValue(mockOrganization.maxMembers);

      await expect(
        service.inviteMember(mockOrganization.id, mockUser.id, dto)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when user already a member', async () => {
      const dto = {
        email: 'existing@example.com',
        roleId: mockPlatformOwnerRole.id,
      };

      jest.spyOn(prisma.organizationMember, 'findUnique').mockResolvedValue(mockMember);
      jest.spyOn(prisma.organization, 'findUnique').mockResolvedValue(mockOrganization);
      jest.spyOn(prisma.organizationMember, 'count').mockResolvedValue(5);
      jest.spyOn(prisma.organizationMember, 'findFirst').mockResolvedValue(mockMember);

      await expect(
        service.inviteMember(mockOrganization.id, mockUser.id, dto)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for pending invitation', async () => {
      const dto = {
        email: 'pending@example.com',
        roleId: mockPlatformOwnerRole.id,
      };

      const pendingInvitation = {
        id: 'inv-123',
        email: dto.email,
        status: 'pending',
      };

      jest.spyOn(prisma.organizationMember, 'findUnique').mockResolvedValue(mockMember);
      jest.spyOn(prisma.organization, 'findUnique').mockResolvedValue(mockOrganization);
      jest.spyOn(prisma.organizationMember, 'count').mockResolvedValue(5);
      jest.spyOn(prisma.organizationMember, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prisma.organizationInvitation, 'findFirst').mockResolvedValue(pendingInvitation as any);

      await expect(
        service.inviteMember(mockOrganization.id, mockUser.id, dto)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('acceptInvitation', () => {
    it('should accept invitation and add user to organization', async () => {
      const token = 'valid-token';
      const mockInvitation = {
        id: 'invitation-123',
        organizationId: mockOrganization.id,
        email: mockUser.email,
        roleId: mockPlatformOwnerRole.id,
        invitedById: 'inviter-123',
        token,
        expiresAt: new Date(Date.now() + 86400000),
        status: 'pending',
        acceptedById: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        organization: mockOrganization,
      };

      jest.spyOn(prisma.organizationInvitation, 'findUnique').mockResolvedValue(mockInvitation);
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser);
      jest.spyOn(prisma.organizationMember, 'count')
        .mockResolvedValueOnce(5) // current member count
        .mockResolvedValueOnce(1); // user's membership count
      jest.spyOn(prisma.organizationMember, 'create').mockResolvedValue(mockMember);
      jest.spyOn(prisma.organizationInvitation, 'update').mockResolvedValue(mockInvitation);

      const result = await service.acceptInvitation(token, mockUser.id);

      expect(result.userId).toBe(mockUser.id);
      expect(prisma.organizationMember.create).toHaveBeenCalled();
      expect(subscriptionService.suspendSubscription).toHaveBeenCalled();
    });

    it('should throw NotFoundException for invalid token', async () => {
      jest.spyOn(prisma.organizationInvitation, 'findUnique').mockResolvedValue(null);

      await expect(service.acceptInvitation('invalid-token', mockUser.id)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw BadRequestException for already used invitation', async () => {
      const mockInvitation = {
        id: 'invitation-123',
        status: 'accepted',
      };

      jest.spyOn(prisma.organizationInvitation, 'findUnique').mockResolvedValue(mockInvitation as any);

      await expect(service.acceptInvitation('token', mockUser.id)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException for expired invitation', async () => {
      const mockInvitation = {
        id: 'invitation-123',
        organizationId: mockOrganization.id,
        email: mockUser.email,
        roleId: mockPlatformOwnerRole.id,
        status: 'pending',
        expiresAt: new Date(Date.now() - 86400000), // Yesterday
        organization: mockOrganization,
      };

      jest.spyOn(prisma.organizationInvitation, 'findUnique').mockResolvedValue(mockInvitation as any);
      jest.spyOn(prisma.organizationInvitation, 'update').mockResolvedValue(mockInvitation as any);

      await expect(service.acceptInvitation('token', mockUser.id)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw ForbiddenException when email does not match', async () => {
      const mockInvitation = {
        id: 'invitation-123',
        organizationId: mockOrganization.id,
        email: 'different@example.com',
        roleId: mockPlatformOwnerRole.id,
        status: 'pending',
        expiresAt: new Date(Date.now() + 86400000),
        organization: mockOrganization,
      };

      jest.spyOn(prisma.organizationInvitation, 'findUnique').mockResolvedValue(mockInvitation as any);
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser);

      await expect(service.acceptInvitation('token', mockUser.id)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should throw BadRequestException when member limit reached', async () => {
      const mockInvitation = {
        id: 'invitation-123',
        organizationId: mockOrganization.id,
        email: mockUser.email,
        roleId: mockPlatformOwnerRole.id,
        status: 'pending',
        expiresAt: new Date(Date.now() + 86400000),
        organization: mockOrganization,
      };

      jest.spyOn(prisma.organizationInvitation, 'findUnique').mockResolvedValue(mockInvitation as any);
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser);
      jest.spyOn(prisma.organizationMember, 'count').mockResolvedValue(mockOrganization.maxMembers);

      await expect(service.acceptInvitation('token', mockUser.id)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('getPendingInvitations', () => {
    it('should return pending invitations', async () => {
      const invitations = [{
        id: 'inv-123',
        email: 'test@example.com',
        status: 'pending',
        invitedBy: mockUser,
      }];

      jest.spyOn(prisma.organizationMember, 'findUnique').mockResolvedValue(mockMember);
      jest.spyOn(prisma.organizationInvitation, 'findMany').mockResolvedValue(invitations as any);

      const result = await service.getPendingInvitations(mockOrganization.id, mockUser.id);

      expect(result).toEqual(invitations);
    });
  });

  describe('getMyPendingInvitations', () => {
    it('should return user pending invitations', async () => {
      const invitations = [{
        id: 'inv-123',
        email: mockUser.email,
        status: 'pending',
        organization: mockOrganization,
        invitedBy: mockUser,
      }];

      jest.spyOn(prisma.organizationInvitation, 'findMany').mockResolvedValue(invitations as any);

      const result = await service.getMyPendingInvitations(mockUser.email);

      expect(result).toEqual(invitations);
    });
  });

  describe('resendInvitation', () => {
    it('should cancel old invitation and create new one', async () => {
      const oldInvitation = {
        id: 'old-inv-123',
        organizationId: mockOrganization.id,
        email: 'test@example.com',
        roleId: mockPlatformOwnerRole.id,
        invitedById: 'inviter-123',
        token: 'old-token',
        status: 'pending',
      };

      const newInvitation = {
        ...oldInvitation,
        id: 'new-inv-123',
        token: 'new-token',
        organization: mockOrganization,
        invitedBy: mockUser,
      };

      jest.spyOn(prisma.organizationMember, 'findUnique').mockResolvedValue(mockMember);
      jest.spyOn(prisma.organizationInvitation, 'findUnique').mockResolvedValue(oldInvitation as any);
      jest.spyOn(prisma.organizationMember, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prisma.organizationInvitation, 'update').mockResolvedValue(oldInvitation as any);
      jest.spyOn(prisma.organizationInvitation, 'create').mockResolvedValue(newInvitation as any);

      const result = await service.resendInvitation(oldInvitation.id, mockOrganization.id, mockUser.id);

      expect(result.id).toBe(newInvitation.id);
      expect(prisma.organizationInvitation.update).toHaveBeenCalledWith({
        where: { id: oldInvitation.id },
        data: { status: 'cancelled' },
      });
    });

    it('should throw NotFoundException for non-existent invitation', async () => {
      jest.spyOn(prisma.organizationMember, 'findUnique').mockResolvedValue(mockMember);
      jest.spyOn(prisma.organizationInvitation, 'findUnique').mockResolvedValue(null);

      await expect(
        service.resendInvitation('non-existent', mockOrganization.id, mockUser.id)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for non-pending invitation', async () => {
      const acceptedInvitation = {
        id: 'inv-123',
        organizationId: mockOrganization.id,
        status: 'accepted',
      };

      jest.spyOn(prisma.organizationMember, 'findUnique').mockResolvedValue(mockMember);
      jest.spyOn(prisma.organizationInvitation, 'findUnique').mockResolvedValue(acceptedInvitation as any);

      await expect(
        service.resendInvitation(acceptedInvitation.id, mockOrganization.id, mockUser.id)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelInvitation', () => {
    it('should cancel pending invitation', async () => {
      const invitation = {
        id: 'inv-123',
        organizationId: mockOrganization.id,
        status: 'pending',
      };

      jest.spyOn(prisma.organizationMember, 'findUnique').mockResolvedValue(mockMember);
      jest.spyOn(prisma.organizationInvitation, 'findUnique').mockResolvedValue(invitation as any);
      jest.spyOn(prisma.organizationInvitation, 'update').mockResolvedValue(invitation as any);

      await service.cancelInvitation(invitation.id, mockOrganization.id, mockUser.id);

      expect(prisma.organizationInvitation.update).toHaveBeenCalledWith({
        where: { id: invitation.id },
        data: { status: 'cancelled' },
      });
    });

    it('should throw NotFoundException for non-existent invitation', async () => {
      jest.spyOn(prisma.organizationMember, 'findUnique').mockResolvedValue(mockMember);
      jest.spyOn(prisma.organizationInvitation, 'findUnique').mockResolvedValue(null);

      await expect(
        service.cancelInvitation('non-existent', mockOrganization.id, mockUser.id)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for non-pending invitation', async () => {
      const acceptedInvitation = {
        id: 'inv-123',
        organizationId: mockOrganization.id,
        status: 'accepted',
      };

      jest.spyOn(prisma.organizationMember, 'findUnique').mockResolvedValue(mockMember);
      jest.spyOn(prisma.organizationInvitation, 'findUnique').mockResolvedValue(acceptedInvitation as any);

      await expect(
        service.cancelInvitation(acceptedInvitation.id, mockOrganization.id, mockUser.id)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('hasPermission', () => {
    it('should return true when user has permission', async () => {
      jest.spyOn(prisma.organizationMember, 'findUnique').mockResolvedValue(mockMember);

      const result = await service.hasPermission(
        mockOrganization.id,
        mockUser.id,
        Permission.MANAGE_ORGANIZATION
      );

      expect(result).toBe(true);
    });

    it('should return false when user does not have permission', async () => {
      const memberWithoutPermission = {
        ...mockMember,
        role: {
          ...mockPlatformOwnerRole,
          permissions: [Permission.VIEW_MEMBERS],
        },
      };

      jest.spyOn(prisma.organizationMember, 'findUnique').mockResolvedValue(memberWithoutPermission);

      const result = await service.hasPermission(
        mockOrganization.id,
        mockUser.id,
        Permission.MANAGE_ORGANIZATION
      );

      expect(result).toBe(false);
    });

    it('should return false when user is not a member', async () => {
      jest.spyOn(prisma.organizationMember, 'findUnique').mockResolvedValue(null);

      const result = await service.hasPermission(
        mockOrganization.id,
        mockUser.id,
        Permission.VIEW_MEMBERS
      );

      expect(result).toBe(false);
    });

    it('should handle JSON string permissions', async () => {
      const memberWithJsonPermissions = {
        ...mockMember,
        role: {
          ...mockPlatformOwnerRole,
          permissions: JSON.stringify([Permission.MANAGE_ORGANIZATION]),
        },
      };

      jest.spyOn(prisma.organizationMember, 'findUnique').mockResolvedValue(memberWithJsonPermissions as any);

      const result = await service.hasPermission(
        mockOrganization.id,
        mockUser.id,
        Permission.MANAGE_ORGANIZATION
      );

      expect(result).toBe(true);
    });
  });

  describe('requirePermission', () => {
    it('should not throw when user has permission', async () => {
      jest.spyOn(prisma.organizationMember, 'findUnique').mockResolvedValue(mockMember);

      await expect(
        service.requirePermission(mockOrganization.id, mockUser.id, Permission.MANAGE_ORGANIZATION)
      ).resolves.not.toThrow();
    });

    it('should throw ForbiddenException when user lacks permission', async () => {
      jest.spyOn(prisma.organizationMember, 'findUnique').mockResolvedValue(null);

      await expect(
        service.requirePermission(mockOrganization.id, mockUser.id, Permission.MANAGE_ORGANIZATION)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getUserPermissions', () => {
    it('should return user permissions', async () => {
      jest.spyOn(prisma.organizationMember, 'findUnique').mockResolvedValue(mockMember);

      const result = await service.getUserPermissions(mockOrganization.id, mockUser.id);

      expect(result).toEqual(mockPlatformOwnerRole.permissions);
    });

    it('should return empty array when user is not a member', async () => {
      jest.spyOn(prisma.organizationMember, 'findUnique').mockResolvedValue(null);

      const result = await service.getUserPermissions(mockOrganization.id, mockUser.id);

      expect(result).toEqual([]);
    });
  });
});
