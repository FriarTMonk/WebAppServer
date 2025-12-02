import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationService } from './organization.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { Permission } from '@mychristiancounselor/shared';
import { createEmailServiceMock } from '../testing';

describe('OrganizationService', () => {
  let service: OrganizationService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const mockPlatformOwnerRole = {
      id: 'platform-role-owner',
      organizationId: '00000000-0000-0000-0000-000000000001',
      name: 'Owner',
      description: 'Full access to manage organization',
      isSystemRole: true,
      permissions: [Permission.MANAGE_ORGANIZATION],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockPrismaService = {
      organization: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      organizationRole: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn().mockResolvedValue(mockPlatformOwnerRole),
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
        {
          provide: EmailService,
          useValue: createEmailServiceMock(),
        },
        {
          provide: SubscriptionService,
          useValue: {
            getSubscriptionStatus: jest.fn(),
            hasFeatureAccess: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<OrganizationService>(OrganizationService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('createOrganization', () => {
    it('should create organization and add creator as owner using platform role', async () => {
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

      const mockOrgMember = {
        id: 'member-123',
        organizationId: mockOrg.id,
        userId,
        roleId: 'platform-role-owner',
        joinedAt: new Date(),
      };

      // Mock Prisma calls
      (prisma.organization.create as jest.Mock).mockResolvedValue(mockOrg);
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
      expect(prisma.organizationRole.findUnique).toHaveBeenCalledWith({
        where: {
          organizationId_name: {
            organizationId: '00000000-0000-0000-0000-000000000001',
            name: 'Owner',
          },
        },
      });
      expect(prisma.organizationMember.create).toHaveBeenCalledWith({
        data: {
          organizationId: mockOrg.id,
          userId,
          roleId: 'platform-role-owner',
        },
      });
      expect(result.name).toBe(dto.name);
      expect(result.licenseStatus).toBe('trial');
    });
  });
});
