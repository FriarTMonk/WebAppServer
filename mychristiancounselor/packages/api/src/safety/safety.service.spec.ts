import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SafetyService } from './safety.service';
import { PrismaService } from '../prisma/prisma.service';
import { BedrockService } from '../ai/bedrock.service';

describe('SafetyService', () => {
  let service: SafetyService;
  let configService: ConfigService;
  let prismaService: PrismaService;
  let bedrockService: BedrockService;

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockPrismaService = {
    safetyDetectionFeedback: {
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockBedrockService = {
    chatCompletion: jest.fn(),
    jsonCompletion: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.restoreAllMocks();

    // Default: OpenAI not configured (pattern-only mode for most tests)
    mockConfigService.get.mockReturnValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SafetyService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: BedrockService, useValue: mockBedrockService },
      ],
    }).compile();

    service = module.get<SafetyService>(SafetyService);
    configService = module.get<ConfigService>(ConfigService);
    prismaService = module.get<PrismaService>(PrismaService);
    bedrockService = module.get<BedrockService>(BedrockService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Crisis Detection - Layered Approach', () => {
    describe('High-Confidence Pattern Detection (Skip AI)', () => {
      it('should detect explicit suicide intent with high confidence', async () => {
        const messages = [
          'I want to kill myself',
          'Thinking about suicide',
          'I want to end my life',
          'I am suicidal',
          'want to take my life',
          'I want to hurt myself',
          'I want to harm myself',
          'better off dead',
          'wish I was dead',
          'no reason to live',
        ];

        for (const msg of messages) {
          const result = await service.detectCrisis(msg);
          expect(result.isDetected).toBe(true);
          expect(result.detectionMethod).toBe('pattern');
          expect(result.confidence).toBe('high');
        }
      });

      it('should detect self-harm with high confidence', async () => {
        const messages = [
          'I want to self-harm',
          'I engage in self harm',
          'I cut myself',
          'thinking of selfharm',
        ];

        for (const msg of messages) {
          const result = await service.detectCrisis(msg);
          expect(result.isDetected).toBe(true);
          expect(result.detectionMethod).toBe('pattern');
          expect(result.confidence).toBe('high');
        }
      });

      it('should detect active abuse with personal context (high confidence)', async () => {
        const messages = [
          'he beats me',
          'I was raped',
          'raped me last night',
          'being molested',
          'he hits me every day',
          'being beaten regularly',
        ];

        for (const msg of messages) {
          const result = await service.detectCrisis(msg);
          expect(result.isDetected).toBe(true);
          expect(result.detectionMethod).toBe('pattern');
          expect(result.confidence).toBe('high');
        }
      });
    });

    describe('Medium-Confidence Pattern Detection (Needs AI Validation)', () => {
      it('should detect ambiguous abuse terms with medium confidence (pattern-only mode)', async () => {
        // Medium-confidence patterns require AI validation
        // Mock AI to return "true" for crisis detection
        jest.spyOn(bedrockService, 'chatCompletion').mockResolvedValue('true');

        const messages = [
          'experiencing abuse',
          'violence in my home',
          'rape is terrible',
          'sexual assault awareness',
        ];

        for (const msg of messages) {
          const result = await service.detectCrisis(msg);
          expect(result.isDetected).toBe(true);
          expect(result.detectionMethod).toBe('both'); // Pattern + AI
          expect(result.confidence).toBe('medium');
        }
      });
    });

    describe('False Positives - Should NOT Detect Crisis', () => {
      it('should not detect crisis in normal emotional messages', async () => {
        // Mock AI to return "false" for non-crisis messages
        jest.spyOn(bedrockService, 'chatCompletion').mockResolvedValue('false');

        const normalMessages = [
          'I am feeling sad today',
          'Need guidance on my marriage',
          'How do I find purpose?',
          'Feeling depressed lately',
          'Struggling with anxiety',
          'Having a tough day',
        ];

        for (const msg of normalMessages) {
          const result = await service.detectCrisis(msg);
          expect(result.isDetected).toBe(false);
        }
      });

      it('should not detect crisis in metaphorical language', async () => {
        // Mock AI to return "false" for non-crisis messages
        jest.spyOn(bedrockService, 'chatCompletion').mockResolvedValue('false');

        const messages = [
          'This movie is killing me with laughter',
          'I am dying to see you',
          'That joke was so bad I wanted to hurt the comedian',
          'This exam is killing me',
          'I could die from embarrassment',
        ];

        for (const msg of messages) {
          const result = await service.detectCrisis(msg);
          expect(result.isDetected).toBe(false);
        }
      });

      it('should not detect crisis in spiritual questions about death', async () => {
        // Mock AI to return "false" for non-crisis messages
        jest.spyOn(bedrockService, 'chatCompletion').mockResolvedValue('false');

        const messages = [
          'God, are you listening?',
          'Where are you God?',
          'Why does God allow suffering?',
          'Will I see my loved ones in heaven?',
          'What happens after we die?',
        ];

        for (const msg of messages) {
          const result = await service.detectCrisis(msg);
          expect(result.isDetected).toBe(false);
        }
      });
    });
  });

  describe('Grief Detection - Layered Approach', () => {
    describe('High-Confidence Pattern Detection', () => {
      it('should detect explicit loss of loved ones with high confidence', async () => {
        const griefMessages = [
          'I lost my mother',
          'my father died',
          'my son passed away',
          'losing my wife',
          'my husband is gone',
          'death of my child',
          'my grandmother died',
          'lost my grandfather',
        ];

        for (const msg of griefMessages) {
          const result = await service.detectGrief(msg);
          expect(result.isDetected).toBe(true);
          expect(result.detectionMethod).toBe('pattern');
          expect(result.confidence).toBe('high');
        }
      });

      it('should detect active grieving language with high confidence', async () => {
        const messages = [
          'grieving over my mother',
          'mourning for my father',
          'at the funeral of my brother',
          'just lost my wife last week',
          'cannot believe my son died',
        ];

        for (const msg of messages) {
          const result = await service.detectGrief(msg);
          expect(result.isDetected).toBe(true);
          expect(result.detectionMethod).toBe('pattern');
          expect(result.confidence).toBe('high');
        }
      });
    });

    describe('Medium-Confidence Pattern Detection', () => {
      it('should detect ambiguous grief terms with medium confidence', async () => {
        // Medium-confidence patterns require AI validation
        // Mock AI to return "true" for grief detection
        jest.spyOn(bedrockService, 'chatCompletion').mockResolvedValue('true');

        const messages = [
          'dealing with death',
          'someone died',
          'attending a funeral',
          'feeling heartbroken',
          'suffering so much pain',
        ];

        for (const msg of messages) {
          const result = await service.detectGrief(msg);
          expect(result.isDetected).toBe(true);
          expect(result.detectionMethod).toBe('both'); // Pattern + AI
          expect(result.confidence).toBe('medium');
        }
      });
    });

    describe('False Positives - Should NOT Detect Grief', () => {
      it('should not detect grief in spiritual seeking', async () => {
        // Mock AI to return "false" for non-grief messages
        jest.spyOn(bedrockService, 'chatCompletion').mockResolvedValue('false');

        const messages = [
          'God, are you listening?',
          'I feel so alone',
          'Why is God silent?',
          'Going through a hard time',
          'Feeling distant from God',
        ];

        for (const msg of messages) {
          const result = await service.detectGrief(msg);
          expect(result.isDetected).toBe(false);
        }
      });

      it('should not detect grief in general discussions', async () => {
        // Mock AI to return "false" for non-grief messages
        jest.spyOn(bedrockService, 'chatCompletion').mockResolvedValue('false');

        const messages = [
          'What happens after death?',
          'Will there be death in heaven?',
          'Jesus conquered death',
          'Eternal life through Christ',
        ];

        for (const msg of messages) {
          const result = await service.detectGrief(msg);
          expect(result.isDetected).toBe(false);
        }
      });
    });
  });

  describe('Crisis Resources', () => {
    it('should return crisis resources', () => {
      const resources = service.getCrisisResources();
      expect(resources.length).toBeGreaterThan(0);
      expect(resources[0]).toHaveProperty('name');
      expect(resources[0]).toHaveProperty('contact');
      expect(resources[0]).toHaveProperty('description');
    });

    it('should generate crisis response with resources', () => {
      const response = service.generateCrisisResponse();
      expect(response).toContain('safety');
      expect(response).toContain('911');
      expect(response).toContain('professional');

      const resources = service.getCrisisResources();
      resources.forEach((resource) => {
        expect(response).toContain(resource.name);
        expect(response).toContain(resource.contact);
      });
    });
  });

  describe('Grief Resources', () => {
    it('should return grief resources', () => {
      const resources = service.getGriefResources();
      expect(resources.length).toBeGreaterThan(0);
      expect(resources[0]).toHaveProperty('name');
      expect(resources[0]).toHaveProperty('contact');
      expect(resources[0]).toHaveProperty('description');
    });

    it('should generate grief response with resources', () => {
      const response = service.generateGriefResponse();
      expect(response).toContain('loss');
      expect(response).toContain('grief');
      expect(response).toContain('Psalm 34:18');

      const resources = service.getGriefResources();
      resources.forEach((resource) => {
        expect(response).toContain(resource.name);
        expect(response).toContain(resource.contact);
      });
    });
  });

  describe('Feedback Logging', () => {
    it('should log crisis detection for tracking', async () => {
      mockPrismaService.safetyDetectionFeedback.create.mockResolvedValue({});

      await service.logDetection(
        'crisis',
        { isDetected: true, detectionMethod: 'pattern', confidence: 'high' },
        'I want to harm myself',
        'session-123',
        'message-456',
        'user-789'
      );

      expect(mockPrismaService.safetyDetectionFeedback.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          detectionType: 'crisis',
          detectionMethod: 'pattern',
          confidenceLevel: 'high',
          messageContent: 'I want to harm myself',
          sessionId: 'session-123',
          messageId: 'message-456',
          userId: 'user-789',
        }),
      });
    });

    it('should log grief detection for tracking', async () => {
      mockPrismaService.safetyDetectionFeedback.create.mockResolvedValue({});

      await service.logDetection(
        'grief',
        { isDetected: true, detectionMethod: 'ai', confidence: 'medium' },
        'my mother passed away',
        'session-123',
        'message-456'
      );

      expect(mockPrismaService.safetyDetectionFeedback.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          detectionType: 'grief',
          detectionMethod: 'ai',
          confidenceLevel: 'medium',
        }),
      });
    });

    it('should handle logging failures gracefully', async () => {
      mockPrismaService.safetyDetectionFeedback.create.mockRejectedValue(new Error('DB error'));

      // Should not throw
      await expect(
        service.logDetection(
          'crisis',
          { isDetected: true, detectionMethod: 'pattern', confidence: 'high' },
          'test message'
        )
      ).resolves.not.toThrow();
    });

    it('should submit user feedback', async () => {
      mockPrismaService.safetyDetectionFeedback.update.mockResolvedValue({});

      await service.submitDetectionFeedback('feedback-123', true, 'This was accurate');

      expect(mockPrismaService.safetyDetectionFeedback.update).toHaveBeenCalledWith({
        where: { id: 'feedback-123' },
        data: {
          isAccurate: true,
          feedbackNote: 'This was accurate',
          feedbackSubmittedAt: expect.any(Date),
        },
      });
    });
  });

  describe('Detection Statistics', () => {
    it('should return detection statistics', async () => {
      mockPrismaService.safetyDetectionFeedback.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(80) // feedback submitted
        .mockResolvedValueOnce(70) // accurate
        .mockResolvedValueOnce(10); // false positives

      mockPrismaService.safetyDetectionFeedback.groupBy
        .mockResolvedValueOnce([
          { detectionMethod: 'pattern', _count: 60 },
          { detectionMethod: 'ai', _count: 40 },
        ])
        .mockResolvedValueOnce([
          { confidenceLevel: 'high', _count: 50 },
          { confidenceLevel: 'medium', _count: 30 },
          { confidenceLevel: 'low', _count: 20 },
        ]);

      const stats = await service.getDetectionStatistics();

      expect(stats.totalDetections).toBe(100);
      expect(stats.feedbackSubmitted).toBe(80);
      expect(stats.accurateDetections).toBe(70);
      expect(stats.falsePositives).toBe(10);
      expect(stats.accuracyRate).toBe('87.50%');
      expect(stats.byMethod).toHaveLength(2);
      expect(stats.byConfidence).toHaveLength(3);
    });

    it('should filter statistics by detection type', async () => {
      mockPrismaService.safetyDetectionFeedback.count.mockResolvedValue(50);
      mockPrismaService.safetyDetectionFeedback.groupBy
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await service.getDetectionStatistics('crisis');

      expect(mockPrismaService.safetyDetectionFeedback.count).toHaveBeenCalledWith({
        where: { detectionType: 'crisis' },
      });
    });

    it('should get false positives for pattern refinement', async () => {
      const mockFalsePositives = [
        {
          id: '1',
          messageContent: 'discussing violence in the Bible',
          detectionMethod: 'pattern',
          confidenceLevel: 'medium',
          feedbackNote: 'This was theological discussion',
          detectedAt: new Date(),
          feedbackSubmittedAt: new Date(),
        },
      ];

      mockPrismaService.safetyDetectionFeedback.findMany.mockResolvedValue(mockFalsePositives);

      const result = await service.getFalsePositives('crisis', 10);

      expect(result).toEqual(mockFalsePositives);
      expect(mockPrismaService.safetyDetectionFeedback.findMany).toHaveBeenCalledWith({
        where: { detectionType: 'crisis', isAccurate: false },
        orderBy: { feedbackSubmittedAt: 'desc' },
        take: 10,
        select: expect.any(Object),
      });
    });
  });
});
