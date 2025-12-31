import { Test, TestingModule } from '@nestjs/testing';
import { TrajectoryCalculationService } from './trajectory-calculation.service';
import { WellbeingHistoryService } from './wellbeing-history.service';

describe('TrajectoryCalculationService', () => {
  let service: TrajectoryCalculationService;

  const mockHistoryService = {
    getRecentHistory: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrajectoryCalculationService,
        { provide: WellbeingHistoryService, useValue: mockHistoryService },
      ],
    }).compile();

    service = module.get<TrajectoryCalculationService>(TrajectoryCalculationService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateTrajectory', () => {
    it('should return "improving" for red -> yellow -> green progression', async () => {
      mockHistoryService.getRecentHistory.mockResolvedValue([
        { status: 'green', createdAt: new Date('2025-01-15') },
        { status: 'yellow', createdAt: new Date('2025-01-08') },
        { status: 'red', createdAt: new Date('2025-01-01') },
      ]);

      const result = await service.calculateTrajectory('member-123');
      expect(result).toBe('improving');
    });

    it('should return "declining" for green -> yellow -> red progression', async () => {
      mockHistoryService.getRecentHistory.mockResolvedValue([
        { status: 'red', createdAt: new Date('2025-01-15') },
        { status: 'yellow', createdAt: new Date('2025-01-08') },
        { status: 'green', createdAt: new Date('2025-01-01') },
      ]);

      const result = await service.calculateTrajectory('member-123');
      expect(result).toBe('declining');
    });

    it('should return "stable" for consistent status', async () => {
      mockHistoryService.getRecentHistory.mockResolvedValue([
        { status: 'green', createdAt: new Date('2025-01-15') },
        { status: 'green', createdAt: new Date('2025-01-08') },
        { status: 'green', createdAt: new Date('2025-01-01') },
      ]);

      const result = await service.calculateTrajectory('member-123');
      expect(result).toBe('stable');
    });

    it('should return "insufficient_data" for less than 2 history records', async () => {
      mockHistoryService.getRecentHistory.mockResolvedValue([
        { status: 'green', createdAt: new Date('2025-01-15') },
      ]);

      const result = await service.calculateTrajectory('member-123');
      expect(result).toBe('insufficient_data');
    });

    it('should return "insufficient_data" for empty history', async () => {
      mockHistoryService.getRecentHistory.mockResolvedValue([]);

      const result = await service.calculateTrajectory('member-123');
      expect(result).toBe('insufficient_data');
    });

    it('should return "improving" for yellow -> green with only 2 records', async () => {
      mockHistoryService.getRecentHistory.mockResolvedValue([
        { status: 'green', createdAt: new Date('2025-01-15') },
        { status: 'yellow', createdAt: new Date('2025-01-08') },
      ]);

      const result = await service.calculateTrajectory('member-123');
      expect(result).toBe('improving');
    });

    it('should return "declining" for yellow -> red with only 2 records', async () => {
      mockHistoryService.getRecentHistory.mockResolvedValue([
        { status: 'red', createdAt: new Date('2025-01-15') },
        { status: 'yellow', createdAt: new Date('2025-01-08') },
      ]);

      const result = await service.calculateTrajectory('member-123');
      expect(result).toBe('declining');
    });

    it('should return "stable" for yellow -> yellow with only 2 records', async () => {
      mockHistoryService.getRecentHistory.mockResolvedValue([
        { status: 'yellow', createdAt: new Date('2025-01-15') },
        { status: 'yellow', createdAt: new Date('2025-01-08') },
      ]);

      const result = await service.calculateTrajectory('member-123');
      expect(result).toBe('stable');
    });

    it('should detect improving trend when latest equals previous but better than older', async () => {
      mockHistoryService.getRecentHistory.mockResolvedValue([
        { status: 'green', createdAt: new Date('2025-01-15') },
        { status: 'green', createdAt: new Date('2025-01-08') },
        { status: 'yellow', createdAt: new Date('2025-01-01') },
      ]);

      const result = await service.calculateTrajectory('member-123');
      expect(result).toBe('improving');
    });

    it('should detect declining trend when latest equals previous but worse than older', async () => {
      mockHistoryService.getRecentHistory.mockResolvedValue([
        { status: 'red', createdAt: new Date('2025-01-15') },
        { status: 'red', createdAt: new Date('2025-01-08') },
        { status: 'yellow', createdAt: new Date('2025-01-01') },
      ]);

      const result = await service.calculateTrajectory('member-123');
      expect(result).toBe('declining');
    });
  });

  describe('getTrajectoryExplanation', () => {
    it('should return explanation for "improving"', () => {
      const result = service.getTrajectoryExplanation('improving');
      expect(result).toContain('positive');
      expect(result).toContain('progression');
    });

    it('should return explanation for "declining"', () => {
      const result = service.getTrajectoryExplanation('declining');
      expect(result).toContain('decline');
      expect(result).toContain('check-in');
    });

    it('should return explanation for "stable"', () => {
      const result = service.getTrajectoryExplanation('stable');
      expect(result).toContain('consistent');
    });

    it('should return explanation for "insufficient_data"', () => {
      const result = service.getTrajectoryExplanation('insufficient_data');
      expect(result).toContain('Not enough');
      expect(result).toContain('data');
    });
  });
});
