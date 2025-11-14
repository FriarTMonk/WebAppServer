import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationService } from './organization.service';
import { PrismaService } from '../prisma/prisma.service';
import { Permission } from '@mychristiancounselor/shared';

describe('OrganizationService', () => {
  let service: OrganizationService;
  let prisma: PrismaService;

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
      },
      organizationMember: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        delete: jest.fn(),
        findFirst: jest.fn(),
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
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<OrganizationService>(OrganizationService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('createOrganization', () => {
    it('should create organization with system roles and add creator as owner', async () => {
      const userId = 'user-123';
      const dto = { name: 'Test Church', description: 'A test church' };

      const mockOrg = {
        id: 'org-123',
        name: dto.name,
        description: dto.description,
        licenseType: null,
        licenseStatus: 'trial',
        licenseExpiresAt: null,
        maxMembers: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockOwnerRole = {
        id: 'role-owner',
        organizationId: mockOrg.id,
        name: 'Owner',
        description: 'Full access to manage organization',
        isSystemRole: true,
        permissions: [Permission.MANAGE_ORGANIZATION],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockCounselorRole = {
        id: 'role-counselor',
        organizationId: mockOrg.id,
        name: 'Counselor',
        description: 'Can view member conversations and analytics',
        isSystemRole: true,
        permissions: [Permission.VIEW_ORGANIZATION],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockMemberRole = {
        id: 'role-member',
        organizationId: mockOrg.id,
        name: 'Member',
        description: 'Basic member access',
        isSystemRole: true,
        permissions: [Permission.VIEW_ORGANIZATION],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockOrgMember = {
        id: 'member-123',
        organizationId: mockOrg.id,
        userId,
        roleId: mockOwnerRole.id,
        joinedAt: new Date(),
      };

      // Mock all Prisma calls in sequence
      (prisma.organization.create as jest.Mock).mockResolvedValue(mockOrg);
      (prisma.organizationRole.create as jest.Mock)
        .mockResolvedValueOnce(mockOwnerRole)
        .mockResolvedValueOnce(mockCounselorRole)
        .mockResolvedValueOnce(mockMemberRole);
      (prisma.organizationMember.create as jest.Mock).mockResolvedValue(mockOrgMember);

      const result = await service.createOrganization(userId, dto);

      expect(prisma.organization.create).toHaveBeenCalledWith({
        data: {
          name: dto.name,
          description: dto.description,
          licenseStatus: 'trial',
          maxMembers: 10,
        },
      });
      expect(prisma.organizationRole.create).toHaveBeenCalledTimes(3); // Owner, Counselor, Member
      expect(prisma.organizationMember.create).toHaveBeenCalledWith({
        data: {
          organizationId: mockOrg.id,
          userId,
          roleId: mockOwnerRole.id,
        },
      });
      expect(result.name).toBe(dto.name);
      expect(result.licenseStatus).toBe('trial');
    });
  });
});
