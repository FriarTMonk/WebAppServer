import { Test, TestingModule } from '@nestjs/testing';
import { WellbeingHistoryService } from './wellbeing-history.service';
import { PrismaService } from '../prisma/prisma.service';
import { WellbeingStatus, WellbeingTrajectory } from '@prisma/client';

describe('WellbeingHistoryService', () => {
  let service: WellbeingHistoryService;
  let prisma: PrismaService;

  const mockPrisma = {
    memberWellbeingHistory: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WellbeingHistoryService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<WellbeingHistoryService>(WellbeingHistoryService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('recordStatusChange', () => {
    it('should record wellbeing status change to history', async () => {
      const memberId = 'member-123';
      const status = WellbeingStatus.red;
      const summary = 'Member showing signs of distress';

      mockPrisma.memberWellbeingHistory.create.mockResolvedValue({
        id: 'history-123',
        memberId,
        status,
        summary,
        trajectory: null,
        overriddenBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.recordStatusChange({
        memberId,
        status,
        summary,
      });

      expect(mockPrisma.memberWellbeingHistory.create).toHaveBeenCalledWith({
        data: {
          memberId,
          status,
          summary,
        },
      });
      expect(result.status).toBe(WellbeingStatus.red);
    });

    it('should record status change with trajectory', async () => {
      const memberId = 'member-123';
      const status = WellbeingStatus.yellow;
      const summary = 'Member showing improvement';
      const trajectory = WellbeingTrajectory.improving;

      mockPrisma.memberWellbeingHistory.create.mockResolvedValue({
        id: 'history-124',
        memberId,
        status,
        summary,
        trajectory,
        overriddenBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.recordStatusChange({
        memberId,
        status,
        summary,
        trajectory,
      });

      expect(mockPrisma.memberWellbeingHistory.create).toHaveBeenCalledWith({
        data: {
          memberId,
          status,
          summary,
          trajectory,
        },
      });
      expect(result.trajectory).toBe(WellbeingTrajectory.improving);
    });

    it('should record counselor override', async () => {
      const memberId = 'member-123';
      const status = WellbeingStatus.green;
      const summary = 'Counselor override: Member is doing well';
      const overriddenBy = 'counselor-456';

      mockPrisma.memberWellbeingHistory.create.mockResolvedValue({
        id: 'history-125',
        memberId,
        status,
        summary,
        trajectory: null,
        overriddenBy,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.recordStatusChange({
        memberId,
        status,
        summary,
        overriddenBy,
      });

      expect(mockPrisma.memberWellbeingHistory.create).toHaveBeenCalledWith({
        data: {
          memberId,
          status,
          summary,
          overriddenBy,
        },
      });
      expect(result.overriddenBy).toBe('counselor-456');
    });
  });

  describe('getHistory', () => {
    it('should retrieve wellbeing history for member', async () => {
      const memberId = 'member-123';
      const mockHistory = [
        {
          id: '1',
          memberId,
          status: WellbeingStatus.green,
          summary: 'Doing well',
          trajectory: null,
          overriddenBy: null,
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-01'),
        },
        {
          id: '2',
          memberId,
          status: WellbeingStatus.yellow,
          summary: 'Some concerns',
          trajectory: WellbeingTrajectory.declining,
          overriddenBy: null,
          createdAt: new Date('2025-01-08'),
          updatedAt: new Date('2025-01-08'),
        },
        {
          id: '3',
          memberId,
          status: WellbeingStatus.red,
          summary: 'Critical concern',
          trajectory: WellbeingTrajectory.declining,
          overriddenBy: null,
          createdAt: new Date('2025-01-15'),
          updatedAt: new Date('2025-01-15'),
        },
      ];

      mockPrisma.memberWellbeingHistory.findMany.mockResolvedValue(mockHistory);

      const result = await service.getHistory(memberId, { limit: 10 });

      expect(mockPrisma.memberWellbeingHistory.findMany).toHaveBeenCalledWith({
        where: { memberId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('1');
    });

    it('should filter history by date range', async () => {
      const memberId = 'member-123';
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      mockPrisma.memberWellbeingHistory.findMany.mockResolvedValue([]);

      await service.getHistory(memberId, { startDate, endDate });

      expect(mockPrisma.memberWellbeingHistory.findMany).toHaveBeenCalledWith({
        where: {
          memberId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
    });

    it('should apply custom limit', async () => {
      const memberId = 'member-123';

      mockPrisma.memberWellbeingHistory.findMany.mockResolvedValue([]);

      await service.getHistory(memberId, { limit: 5 });

      expect(mockPrisma.memberWellbeingHistory.findMany).toHaveBeenCalledWith({
        where: { memberId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });
    });
  });

  describe('getRecentHistory', () => {
    it('should retrieve recent history for trajectory calculation', async () => {
      const memberId = 'member-123';
      const mockHistory = [
        {
          id: '3',
          memberId,
          status: WellbeingStatus.red,
          summary: 'Latest status',
          trajectory: WellbeingTrajectory.declining,
          overriddenBy: null,
          createdAt: new Date('2025-01-15'),
          updatedAt: new Date('2025-01-15'),
        },
        {
          id: '2',
          memberId,
          status: WellbeingStatus.yellow,
          summary: 'Previous status',
          trajectory: null,
          overriddenBy: null,
          createdAt: new Date('2025-01-08'),
          updatedAt: new Date('2025-01-08'),
        },
        {
          id: '1',
          memberId,
          status: WellbeingStatus.green,
          summary: 'Earlier status',
          trajectory: null,
          overriddenBy: null,
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-01'),
        },
      ];

      mockPrisma.memberWellbeingHistory.findMany.mockResolvedValue(mockHistory);

      const result = await service.getRecentHistory(memberId, 3);

      expect(mockPrisma.memberWellbeingHistory.findMany).toHaveBeenCalledWith({
        where: { memberId },
        orderBy: { createdAt: 'desc' },
        take: 3,
      });
      expect(result).toHaveLength(3);
      expect(result[0].status).toBe(WellbeingStatus.red);
    });

    it('should default to 3 records if count not specified', async () => {
      const memberId = 'member-123';

      mockPrisma.memberWellbeingHistory.findMany.mockResolvedValue([]);

      await service.getRecentHistory(memberId);

      expect(mockPrisma.memberWellbeingHistory.findMany).toHaveBeenCalledWith({
        where: { memberId },
        orderBy: { createdAt: 'desc' },
        take: 3,
      });
    });
  });
});
