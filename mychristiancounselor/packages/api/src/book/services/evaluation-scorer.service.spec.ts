import { Test } from '@nestjs/testing';
import { EvaluationScorerService } from './evaluation-scorer.service';
import { BedrockService } from '../../ai/bedrock.service';

describe('EvaluationScorerService', () => {
  let service: EvaluationScorerService;
  let mockBedrockService: any;

  beforeEach(async () => {
    mockBedrockService = {
      jsonCompletion: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        EvaluationScorerService,
        {
          provide: BedrockService,
          useValue: mockBedrockService,
        },
      ],
    }).compile();

    service = module.get<EvaluationScorerService>(EvaluationScorerService);
  });

  it('should evaluate book using primary model', async () => {
    const mockResponse = {
      biblicalAlignmentScore: 92,
      theologicalSummary: 'A solid evangelical work',
      doctrineCategoryScores: [
        { category: 'Soteriology', score: 95, notes: 'Strong Reformed soteriology' },
      ],
      denominationalTags: ['Reformed', 'Evangelical'],
      matureContent: false,
      scriptureComparisonNotes: 'Well-grounded in Scripture',
      theologicalStrengths: ['Clear gospel presentation'],
      theologicalConcerns: [],
      scoringReasoning: 'Aligns well with Sola Scriptura',
    };

    mockBedrockService.jsonCompletion.mockResolvedValue(mockResponse);

    const result = await service.evaluate({
      metadata: {
        title: 'Mere Christianity',
        author: 'C.S. Lewis',
      },
      content: 'Description of the book',
      contentType: 'description',
    });

    expect(result.score).toBe(92);
    expect(result.summary).toContain('evangelical');
    expect(result.modelUsed).toBe('claude-sonnet-4-20250514');
    expect(mockBedrockService.jsonCompletion).toHaveBeenCalledWith(
      'sonnet',
      expect.arrayContaining([
        expect.objectContaining({ role: 'user' })
      ]),
      expect.objectContaining({
        max_tokens: 4096,
      })
    );
  });

  it('should parse JSON from Claude response', async () => {
    const mockResponse = {
      biblicalAlignmentScore: 85,
      theologicalSummary: 'test',
      doctrineCategoryScores: [],
      denominationalTags: [],
      matureContent: false,
      scriptureComparisonNotes: '',
      theologicalStrengths: [],
      theologicalConcerns: [],
      scoringReasoning: '',
    };

    mockBedrockService.jsonCompletion.mockResolvedValue(mockResponse);

    const result = await service.evaluate({
      metadata: { title: 'Test', author: 'Author' },
      content: 'Content',
      contentType: 'description',
    });

    expect(result.score).toBe(85);
  });
});
