import { Test } from '@nestjs/testing';
import { EvaluationOrchestratorService } from './evaluation-orchestrator.service';
import { EvaluationScorerService } from './evaluation-scorer.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('EvaluationOrchestratorService', () => {
  let orchestrator: EvaluationOrchestratorService;
  let scorer: EvaluationScorerService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        EvaluationOrchestratorService,
        {
          provide: EvaluationScorerService,
          useValue: {
            evaluate: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            book: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            evaluationRecord: {
              create: jest.fn(),
            },
            doctrineCategoryScore: {
              createMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    orchestrator = module.get<EvaluationOrchestratorService>(EvaluationOrchestratorService);
    scorer = module.get<EvaluationScorerService>(EvaluationScorerService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should evaluate with description for non-borderline score', async () => {
    const mockBook = {
      id: 'book-id',
      title: 'Test Book',
      author: 'Test Author',
      description: 'Test description',
      pdfStoragePath: null,
    };

    const mockEvalResult = {
      score: 95, // Globally aligned, not borderline (>93, outside borderline range)
      summary: 'Good book',
      doctrineCategoryScores: [],
      denominationalTags: [],
      matureContent: false,
      strengths: [],
      concerns: [],
      reasoning: 'Well aligned',
      scripture: 'Solid',
      modelUsed: 'claude-sonnet-4-20250514',
      analysisLevel: 'description',
    };

    jest.spyOn(prisma.book, 'findUnique').mockResolvedValue(mockBook as any);
    jest.spyOn(scorer, 'evaluate').mockResolvedValue(mockEvalResult);
    jest.spyOn(prisma.book, 'update').mockResolvedValue({} as any);
    jest.spyOn(prisma.evaluationRecord, 'create').mockResolvedValue({} as any);
    jest.spyOn(prisma.doctrineCategoryScore, 'createMany').mockResolvedValue({} as any);

    await orchestrator.evaluateBook('book-id');

    expect(scorer.evaluate).toHaveBeenCalledTimes(1);
    expect(scorer.evaluate).toHaveBeenCalledWith({
      metadata: { title: 'Test Book', author: 'Test Author' },
      content: 'Test description',
      contentType: 'description',
    });
    expect(prisma.book.update).toHaveBeenCalledWith({
      where: { id: 'book-id' },
      data: expect.objectContaining({
        biblicalAlignmentScore: 95,
        visibilityTier: 'globally_aligned',
        evaluationStatus: 'completed',
      }),
    });
  });

  it('should escalate to Opus for borderline scores', async () => {
    const mockBook = {
      id: 'book-id',
      title: 'Test Book',
      author: 'Test Author',
      description: 'Test description',
      pdfStoragePath: null,
    };

    const sonnetResult = {
      score: 72, // Borderline (70 +/- 3)
      summary: 'Decent book',
      doctrineCategoryScores: [],
      denominationalTags: [],
      matureContent: false,
      strengths: [],
      concerns: [],
      reasoning: 'Borderline',
      scripture: 'Mixed',
      modelUsed: 'claude-sonnet-4-20250514',
      analysisLevel: 'description',
    };

    const opusResult = {
      ...sonnetResult,
      score: 75,
      modelUsed: 'claude-opus-4-20250514',
    };

    jest.spyOn(prisma.book, 'findUnique').mockResolvedValue(mockBook as any);
    jest.spyOn(scorer, 'evaluate')
      .mockResolvedValueOnce(sonnetResult) // Sonnet evaluation
      .mockResolvedValueOnce(opusResult);  // Opus re-evaluation
    jest.spyOn(prisma.book, 'update').mockResolvedValue({} as any);
    jest.spyOn(prisma.evaluationRecord, 'create').mockResolvedValue({} as any);
    jest.spyOn(prisma.doctrineCategoryScore, 'createMany').mockResolvedValue({} as any);

    await orchestrator.evaluateBook('book-id');

    expect(scorer.evaluate).toHaveBeenCalledTimes(2);
    expect(prisma.book.update).toHaveBeenCalledWith({
      where: { id: 'book-id' },
      data: expect.objectContaining({
        biblicalAlignmentScore: 75,
        aiModel: 'claude-opus-4-20250514',
      }),
    });
  });

  it('should determine visibility tier based on score', async () => {
    const mockBook = {
      id: 'book-id',
      title: 'Test Book',
      author: 'Test Author',
      description: 'Test description',
      pdfStoragePath: null,
    };

    const testCases = [
      { score: 65, expectedTier: 'not_aligned' },
      { score: 75, expectedTier: 'conceptually_aligned' },
      { score: 95, expectedTier: 'globally_aligned' },
    ];

    for (const testCase of testCases) {
      const mockEvalResult = {
        score: testCase.score,
        summary: 'Test summary',
        doctrineCategoryScores: [],
        denominationalTags: [],
        matureContent: false,
        strengths: [],
        concerns: [],
        reasoning: 'Test reasoning',
        scripture: 'Test scripture',
        modelUsed: 'claude-sonnet-4-20250514',
        analysisLevel: 'description',
      };

      jest.spyOn(prisma.book, 'findUnique').mockResolvedValue(mockBook as any);
      jest.spyOn(scorer, 'evaluate').mockResolvedValue(mockEvalResult);
      jest.spyOn(prisma.book, 'update').mockResolvedValue({} as any);
      jest.spyOn(prisma.evaluationRecord, 'create').mockResolvedValue({} as any);
      jest.spyOn(prisma.doctrineCategoryScore, 'createMany').mockResolvedValue({} as any);

      await orchestrator.evaluateBook('book-id');

      expect(prisma.book.update).toHaveBeenCalledWith({
        where: { id: 'book-id' },
        data: expect.objectContaining({
          visibilityTier: testCase.expectedTier,
        }),
      });
    }
  });

  it('should throw NotFoundException if book does not exist', async () => {
    jest.spyOn(prisma.book, 'findUnique').mockResolvedValue(null);

    await expect(orchestrator.evaluateBook('nonexistent-id')).rejects.toThrow('Book nonexistent-id not found');
  });

  it('should detect borderline scores at lower threshold (67-73 range)', async () => {
    const mockBook = {
      id: 'book-id',
      title: 'Test Book',
      author: 'Test Author',
      description: 'Test description',
      pdfStoragePath: null,
    };

    // Test scores in 67-73 range
    const borderlineScores = [67, 68, 70, 72, 73];

    for (const score of borderlineScores) {
      const sonnetResult = {
        score,
        summary: 'Borderline book',
        doctrineCategoryScores: [],
        denominationalTags: [],
        matureContent: false,
        strengths: [],
        concerns: [],
        reasoning: 'Borderline',
        scripture: 'Mixed',
        modelUsed: 'claude-sonnet-4-20250514',
        analysisLevel: 'description',
      };

      const opusResult = { ...sonnetResult, modelUsed: 'claude-opus-4-20250514' };

      jest.spyOn(prisma.book, 'findUnique').mockResolvedValue(mockBook as any);
      jest.spyOn(scorer, 'evaluate')
        .mockResolvedValueOnce(sonnetResult)
        .mockResolvedValueOnce(opusResult);
      jest.spyOn(prisma.book, 'update').mockResolvedValue({} as any);
      jest.spyOn(prisma.evaluationRecord, 'create').mockResolvedValue({} as any);
      jest.spyOn(prisma.doctrineCategoryScore, 'createMany').mockResolvedValue({} as any);

      await orchestrator.evaluateBook('book-id');

      // Should escalate to Opus for borderline scores
      expect(scorer.evaluate).toHaveBeenCalledTimes(2);

      // Reset mocks for next iteration
      jest.clearAllMocks();
    }
  });

  it('should detect borderline scores at upper threshold (87-93 range)', async () => {
    const mockBook = {
      id: 'book-id',
      title: 'Test Book',
      author: 'Test Author',
      description: 'Test description',
      pdfStoragePath: null,
    };

    // Test scores in 87-93 range
    const borderlineScores = [87, 88, 90, 92, 93];

    for (const score of borderlineScores) {
      const sonnetResult = {
        score,
        summary: 'Borderline book',
        doctrineCategoryScores: [],
        denominationalTags: [],
        matureContent: false,
        strengths: [],
        concerns: [],
        reasoning: 'Borderline',
        scripture: 'Mixed',
        modelUsed: 'claude-sonnet-4-20250514',
        analysisLevel: 'description',
      };

      const opusResult = { ...sonnetResult, modelUsed: 'claude-opus-4-20250514' };

      jest.spyOn(prisma.book, 'findUnique').mockResolvedValue(mockBook as any);
      jest.spyOn(scorer, 'evaluate')
        .mockResolvedValueOnce(sonnetResult)
        .mockResolvedValueOnce(opusResult);
      jest.spyOn(prisma.book, 'update').mockResolvedValue({} as any);
      jest.spyOn(prisma.evaluationRecord, 'create').mockResolvedValue({} as any);
      jest.spyOn(prisma.doctrineCategoryScore, 'createMany').mockResolvedValue({} as any);

      await orchestrator.evaluateBook('book-id');

      // Should escalate to Opus for borderline scores
      expect(scorer.evaluate).toHaveBeenCalledTimes(2);

      // Reset mocks for next iteration
      jest.clearAllMocks();
    }
  });

  it('should save doctrine category scores when provided', async () => {
    const mockBook = {
      id: 'book-id',
      title: 'Test Book',
      author: 'Test Author',
      description: 'Test description',
      pdfStoragePath: null,
    };

    const mockEvalResult = {
      score: 80,
      summary: 'Good book',
      doctrineCategoryScores: [
        { category: 'Christology', score: 95, notes: 'Excellent' },
        { category: 'Soteriology', score: 85, notes: 'Good' },
      ],
      denominationalTags: ['Reformed', 'Evangelical'],
      matureContent: false,
      strengths: ['Clear gospel'],
      concerns: [],
      reasoning: 'Well aligned',
      scripture: 'Solid',
      modelUsed: 'claude-sonnet-4-20250514',
      analysisLevel: 'description',
    };

    jest.spyOn(prisma.book, 'findUnique').mockResolvedValue(mockBook as any);
    jest.spyOn(scorer, 'evaluate').mockResolvedValue(mockEvalResult);
    jest.spyOn(prisma.book, 'update').mockResolvedValue({} as any);
    jest.spyOn(prisma.evaluationRecord, 'create').mockResolvedValue({} as any);
    jest.spyOn(prisma.doctrineCategoryScore, 'createMany').mockResolvedValue({} as any);

    await orchestrator.evaluateBook('book-id');

    expect(prisma.doctrineCategoryScore.createMany).toHaveBeenCalledWith({
      data: [
        { bookId: 'book-id', category: 'Christology', score: 95, notes: 'Excellent' },
        { bookId: 'book-id', category: 'Soteriology', score: 85, notes: 'Good' },
      ],
      skipDuplicates: true,
    });
  });
});
