import { Test, TestingModule } from '@nestjs/testing';
import { AssessmentScoringService } from './assessment-scoring.service';
import { AssessmentService } from './assessment.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AssessmentScoringService', () => {
  let service: AssessmentScoringService;

  const mockAssessmentService = {
    getResponses: jest.fn(),
  };

  const mockPrisma = {
    assignedAssessment: {
      findUnique: jest.fn(),
    },
    assessmentResponse: {
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssessmentScoringService,
        { provide: AssessmentService, useValue: mockAssessmentService },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AssessmentScoringService>(AssessmentScoringService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('scoreAssessment', () => {
    it('should calculate PHQ-9 score correctly', async () => {
      const assignedId = 'assigned-123';

      mockPrisma.assignedAssessment.findUnique.mockResolvedValue({
        id: assignedId,
        assessmentId: 'phq-9-id',
        assessment: {
          type: 'phq-9',
        },
      });

      mockAssessmentService.getResponses.mockResolvedValue({
        id: 'response-123',
        assignedAssessmentId: assignedId,
        answers: [
          { questionId: 'phq9_q1', value: 2 },
          { questionId: 'phq9_q2', value: 3 },
          { questionId: 'phq9_q3', value: 1 },
          { questionId: 'phq9_q4', value: 2 },
          { questionId: 'phq9_q5', value: 1 },
          { questionId: 'phq9_q6', value: 0 },
          { questionId: 'phq9_q7', value: 1 },
          { questionId: 'phq9_q8', value: 0 },
          { questionId: 'phq9_q9', value: 0 },
        ],
        completedAt: new Date(),
      });

      mockPrisma.assessmentResponse.update.mockResolvedValue({
        id: 'response-123',
        assignedAssessmentId: assignedId,
        score: 10,
        interpretation: 'Moderate depression',
      });

      const result = await service.scoreAssessment(assignedId);

      expect(result.totalScore).toBe(10); // 2+3+1+2+1+0+1+0+0
      expect(result.severityLevel).toBe('moderate'); // 10 falls in moderate range (10-14)
    });

    it('should determine correct severity level', () => {
      const phq9Score = 15;
      const result = service.getSeverityLevel('phq-9', phq9Score);
      expect(result.level).toBe('moderately-severe');
      expect(result.description).toContain('Moderately severe depression');
    });
  });
});
