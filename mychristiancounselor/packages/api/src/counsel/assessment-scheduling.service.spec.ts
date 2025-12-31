import { Test, TestingModule } from '@nestjs/testing';
import { AssessmentSchedulingService } from './assessment-scheduling.service';
import { PrismaService } from '../prisma/prisma.service';
import { AssessmentService } from './assessment.service';

describe('AssessmentSchedulingService', () => {
  let service: AssessmentSchedulingService;

  const mockPrisma = {
    assessmentSchedule: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    counselorAssignment: {
      findMany: jest.fn(),
    },
    assignedAssessment: {
      findFirst: jest.fn(),
    },
  };

  const mockAssessmentService = {
    assignAssessment: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssessmentSchedulingService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AssessmentService, useValue: mockAssessmentService },
      ],
    }).compile();

    service = module.get<AssessmentSchedulingService>(
      AssessmentSchedulingService,
    );
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processScheduledAssessments', () => {
    it('should assign assessments based on schedule rules', async () => {
      const now = new Date();

      // Mock active schedules
      mockPrisma.assessmentSchedule.findMany.mockResolvedValue([
        {
          id: 'schedule-123',
          assessmentId: 'phq-9-id',
          assessment: { type: 'phq-9' },
          targetType: 'all_assigned_members',
          frequencyDays: 14,
          isActive: true,
        },
      ]);

      // Mock members assigned to counselors
      mockPrisma.counselorAssignment.findMany.mockResolvedValue([
        {
          memberId: 'member-123',
          counselorId: 'counselor-123',
          status: 'active',
        },
      ]);

      // Mock no recent assessment (eligible for assignment)
      mockPrisma.assignedAssessment.findFirst.mockResolvedValue(null);

      mockAssessmentService.assignAssessment.mockResolvedValue({
        id: 'assigned-123',
      });

      await service.processScheduledAssessments();

      expect(mockAssessmentService.assignAssessment).toHaveBeenCalledWith(
        expect.objectContaining({
          memberId: 'member-123',
          assessmentId: 'phq-9-id',
        }),
      );
    });

    it('should skip members who are not eligible due to frequency', async () => {
      // Mock active schedules
      mockPrisma.assessmentSchedule.findMany.mockResolvedValue([
        {
          id: 'schedule-123',
          assessmentId: 'phq-9-id',
          assessment: { type: 'phq-9' },
          targetType: 'all_assigned_members',
          frequencyDays: 14,
          isActive: true,
        },
      ]);

      // Mock members assigned to counselors
      mockPrisma.counselorAssignment.findMany.mockResolvedValue([
        {
          memberId: 'member-123',
          counselorId: 'counselor-123',
          status: 'active',
        },
      ]);

      // Mock recent assessment (completed 7 days ago, frequency is 14 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      mockPrisma.assignedAssessment.findFirst.mockResolvedValue({
        id: 'prev-assignment',
        createdAt: sevenDaysAgo,
        memberId: 'member-123',
        assessmentId: 'phq-9-id',
      });

      await service.processScheduledAssessments();

      // Should NOT assign because frequency period has not elapsed
      expect(mockAssessmentService.assignAssessment).not.toHaveBeenCalled();
    });

    it('should handle errors for individual schedules gracefully', async () => {
      // Mock active schedules
      mockPrisma.assessmentSchedule.findMany.mockResolvedValue([
        {
          id: 'schedule-123',
          assessmentId: 'phq-9-id',
          assessment: { type: 'phq-9' },
          targetType: 'all_assigned_members',
          frequencyDays: 14,
          isActive: true,
        },
        {
          id: 'schedule-456',
          assessmentId: 'gad-7-id',
          assessment: { type: 'gad-7' },
          targetType: 'all_assigned_members',
          frequencyDays: 14,
          isActive: true,
        },
      ]);

      // First schedule throws error
      mockPrisma.counselorAssignment.findMany
        .mockRejectedValueOnce(new Error('Database error'))
        .mockResolvedValueOnce([
          {
            memberId: 'member-456',
            counselorId: 'counselor-456',
            status: 'active',
          },
        ]);

      mockPrisma.assignedAssessment.findFirst.mockResolvedValue(null);
      mockAssessmentService.assignAssessment.mockResolvedValue({
        id: 'assigned-456',
      });

      // Should not throw, should continue processing second schedule
      await expect(
        service.processScheduledAssessments(),
      ).resolves.not.toThrow();

      // Second schedule should still be processed
      expect(mockAssessmentService.assignAssessment).toHaveBeenCalledWith(
        expect.objectContaining({
          memberId: 'member-456',
          assessmentId: 'gad-7-id',
        }),
      );
    });
  });

  describe('createSchedule', () => {
    it('should create a new assessment schedule', async () => {
      const dto = {
        name: 'Bi-weekly PHQ-9',
        assessmentId: 'phq-9-id',
        targetType: 'all_assigned_members',
        frequencyDays: 14,
        organizationId: 'org-123',
        createdBy: 'counselor-123',
      };

      mockPrisma.assessmentSchedule.create.mockResolvedValue({
        id: 'schedule-123',
        ...dto,
        isActive: true,
      });

      const result = await service.createSchedule(dto);

      expect(mockPrisma.assessmentSchedule.create).toHaveBeenCalledWith({
        data: {
          name: dto.name,
          assessmentId: dto.assessmentId,
          targetType: dto.targetType,
          frequencyDays: dto.frequencyDays,
          organizationId: dto.organizationId,
          createdBy: dto.createdBy,
          isActive: true,
        },
      });

      expect(result).toEqual(
        expect.objectContaining({
          id: 'schedule-123',
          name: dto.name,
        }),
      );
    });
  });
});
