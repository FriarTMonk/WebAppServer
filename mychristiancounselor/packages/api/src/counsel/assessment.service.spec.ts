import { Test, TestingModule } from '@nestjs/testing';
import { AssessmentService } from './assessment.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('AssessmentService', () => {
  let service: AssessmentService;

  const mockPrisma = {
    assignedAssessment: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    assessmentResponse: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssessmentService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AssessmentService>(AssessmentService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('assignAssessment', () => {
    it('should assign assessment to member', async () => {
      const assignment = {
        memberId: 'member-123',
        assessmentId: 'assessment-123',
        assignedBy: 'counselor-123',
        dueDate: new Date('2025-02-01'),
        notes: 'Please complete by due date',
      };

      mockPrisma.assignedAssessment.create.mockResolvedValue({
        id: 'assigned-123',
        ...assignment,
        status: 'pending',
        completedAt: null,
        createdAt: new Date(),
      });

      const result = await service.assignAssessment(assignment);

      expect(mockPrisma.assignedAssessment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          memberId: 'member-123',
          assessmentId: 'assessment-123',
          assignedBy: 'counselor-123',
          status: 'pending',
        }),
      });
      expect(result.status).toBe('pending');
    });

    it('should handle optional fields', async () => {
      const assignment = {
        memberId: 'member-123',
        assessmentId: 'assessment-123',
        assignedBy: 'counselor-123',
      };

      mockPrisma.assignedAssessment.create.mockResolvedValue({
        id: 'assigned-123',
        ...assignment,
        dueDate: null,
        status: 'pending',
        completedAt: null,
        createdAt: new Date(),
      });

      const result = await service.assignAssessment(assignment);

      expect(result).toBeDefined();
      expect(result.status).toBe('pending');
    });
  });

  describe('getAssignedAssessments', () => {
    it('should return all assigned assessments for a member', async () => {
      const memberId = 'member-123';
      const mockAssignments = [
        {
          id: 'assigned-1',
          memberId,
          assessmentId: 'assessment-1',
          status: 'pending',
          createdAt: new Date(),
        },
        {
          id: 'assigned-2',
          memberId,
          assessmentId: 'assessment-2',
          status: 'completed',
          createdAt: new Date(),
        },
      ];

      mockPrisma.assignedAssessment.findMany.mockResolvedValue(mockAssignments);

      const result = await service.getAssignedAssessments(memberId);

      expect(mockPrisma.assignedAssessment.findMany).toHaveBeenCalledWith({
        where: { memberId },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockAssignments);
      expect(result).toHaveLength(2);
    });

    it('should filter by status when provided', async () => {
      const memberId = 'member-123';
      const mockAssignments = [
        {
          id: 'assigned-1',
          memberId,
          assessmentId: 'assessment-1',
          status: 'pending',
          createdAt: new Date(),
        },
      ];

      mockPrisma.assignedAssessment.findMany.mockResolvedValue(mockAssignments);

      const result = await service.getAssignedAssessments(memberId, 'pending');

      expect(mockPrisma.assignedAssessment.findMany).toHaveBeenCalledWith({
        where: { memberId, status: 'pending' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockAssignments);
    });
  });

  describe('submitResponse', () => {
    it('should save assessment responses and mark as completed', async () => {
      const responses = [
        { questionId: 'phq9_q1', value: 2 },
        { questionId: 'phq9_q2', value: 1 },
      ];

      mockPrisma.assignedAssessment.findUnique.mockResolvedValue({
        id: 'assigned-123',
        assessmentId: 'assessment-123',
        status: 'pending',
        memberId: 'member-123',
        assignedBy: 'counselor-123',
        createdAt: new Date(),
      });

      mockPrisma.assessmentResponse.create.mockResolvedValue({
        id: 'response-123',
        assignedAssessmentId: 'assigned-123',
        answers: responses,
        completedAt: new Date(),
      });

      mockPrisma.assignedAssessment.update.mockResolvedValue({
        id: 'assigned-123',
        status: 'completed',
        completedAt: new Date(),
      });

      const result = await service.submitResponse(
        'assigned-123',
        'member-123',
        responses,
      );

      expect(mockPrisma.assignedAssessment.findUnique).toHaveBeenCalledWith({
        where: { id: 'assigned-123' },
      });

      expect(mockPrisma.assessmentResponse.create).toHaveBeenCalledWith({
        data: {
          assignedAssessmentId: 'assigned-123',
          answers: responses,
        },
      });

      expect(mockPrisma.assignedAssessment.update).toHaveBeenCalledWith({
        where: { id: 'assigned-123' },
        data: expect.objectContaining({
          status: 'completed',
          completedAt: expect.any(Date),
        }),
      });

      expect(result.status).toBe('completed');
    });

    it('should throw NotFoundException if assignment not found', async () => {
      mockPrisma.assignedAssessment.findUnique.mockResolvedValue(null);

      await expect(
        service.submitResponse('invalid-id', 'member-123', []),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if assignment belongs to different member', async () => {
      mockPrisma.assignedAssessment.findUnique.mockResolvedValue({
        id: 'assigned-123',
        assessmentId: 'assessment-123',
        status: 'pending',
        memberId: 'different-member',
        createdAt: new Date(),
      });

      await expect(
        service.submitResponse('assigned-123', 'member-123', []),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getResponses', () => {
    it('should return responses for an assigned assessment', async () => {
      const mockResponse = {
        id: 'response-123',
        assignedAssessmentId: 'assigned-123',
        answers: [
          { questionId: 'phq9_q1', value: 2 },
          { questionId: 'phq9_q2', value: 1 },
        ],
        score: 15,
        interpretation: 'Moderate depression',
        completedAt: new Date(),
      };

      mockPrisma.assessmentResponse.findUnique.mockResolvedValue(mockResponse);

      const result = await service.getResponses('assigned-123');

      expect(mockPrisma.assessmentResponse.findUnique).toHaveBeenCalledWith({
        where: { assignedAssessmentId: 'assigned-123' },
      });
      expect(result).toEqual(mockResponse);
    });

    it('should return null if no responses found', async () => {
      mockPrisma.assessmentResponse.findUnique.mockResolvedValue(null);

      const result = await service.getResponses('assigned-123');

      expect(result).toBeNull();
    });
  });
});
