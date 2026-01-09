import { Test } from '@nestjs/testing';
import { VisibilityCheckerService } from './visibility-checker.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

describe('VisibilityCheckerService', () => {
  let service: VisibilityCheckerService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        VisibilityCheckerService,
        {
          provide: PrismaService,
          useValue: {
            book: { findUnique: jest.fn() },
            user: { findUnique: jest.fn() },
            organization: { findUnique: jest.fn() },
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<VisibilityCheckerService>(VisibilityCheckerService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should deny access to not_aligned books', async () => {
    jest.spyOn(prisma.book, 'findUnique').mockResolvedValue({
      id: 'book-id',
      visibilityTier: 'not_aligned',
      biblicalAlignmentScore: 50,
    } as any);

    const canAccess = await service.canAccess('user-id', 'book-id', 'book');

    expect(canAccess).toBe(false);
  });

  it('should allow access to globally_aligned books', async () => {
    jest.spyOn(prisma.book, 'findUnique').mockResolvedValue({
      id: 'book-id',
      visibilityTier: 'globally_aligned',
      biblicalAlignmentScore: 95,
      matureContent: false,
    } as any);

    jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
      id: 'user-id',
      accountType: 'adult',
    } as any);

    const canAccess = await service.canAccess('user-id', 'book-id', 'book');

    expect(canAccess).toBe(true);
  });

  it('should check org membership for conceptually_aligned books', async () => {
    jest.spyOn(prisma.book, 'findUnique').mockResolvedValue({
      id: 'book-id',
      visibilityTier: 'conceptually_aligned',
      biblicalAlignmentScore: 80,
      matureContent: false,
      endorsements: [{ organizationId: 'org-1' }],
    } as any);

    jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
      id: 'user-id',
      accountType: 'adult',
      organizationMemberships: [{ organizationId: 'org-1' }],
    } as any);

    const canAccess = await service.canAccess('user-id', 'book-id', 'book');

    expect(canAccess).toBe(true);
  });

  it('should deny access to mature content for child accounts', async () => {
    jest.spyOn(prisma.book, 'findUnique').mockResolvedValue({
      id: 'book-id',
      visibilityTier: 'globally_aligned',
      matureContent: true,
    } as any);

    jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
      id: 'user-id',
      accountType: 'child',
    } as any);

    const canAccess = await service.canAccess('user-id', 'book-id', 'book');

    expect(canAccess).toBe(false);
  });
});
