import { Test } from '@nestjs/testing';
import { EvaluationScorerService } from './evaluation-scorer.service';
import Anthropic from '@anthropic-ai/sdk';

describe('EvaluationScorerService', () => {
  let service: EvaluationScorerService;
  let mockAnthropicClient: any;

  beforeEach(async () => {
    mockAnthropicClient = {
      messages: {
        create: jest.fn(),
      },
    };

    const module = await Test.createTestingModule({
      providers: [
        EvaluationScorerService,
        {
          provide: 'ANTHROPIC_CLIENT',
          useValue: mockAnthropicClient,
        },
      ],
    }).compile();

    service = module.get<EvaluationScorerService>(EvaluationScorerService);
  });

  it('should evaluate book using primary model', async () => {
    const mockResponse = {
      content: [{
        type: 'text',
        text: JSON.stringify({
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
        }),
      }],
    };

    mockAnthropicClient.messages.create.mockResolvedValue(mockResponse as any);

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
    expect(mockAnthropicClient.messages.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
      })
    );
  });

  it('should parse JSON from Claude response', async () => {
    const mockResponse = {
      content: [{
        type: 'text',
        text: '{"biblicalAlignmentScore": 85, "theologicalSummary": "test", "doctrineCategoryScores": [], "denominationalTags": [], "matureContent": false, "scriptureComparisonNotes": "", "theologicalStrengths": [], "theologicalConcerns": [], "scoringReasoning": ""}',
      }],
    };

    mockAnthropicClient.messages.create.mockResolvedValue(mockResponse as any);

    const result = await service.evaluate({
      metadata: { title: 'Test', author: 'Author' },
      content: 'Content',
      contentType: 'description',
    });

    expect(result.score).toBe(85);
  });
});
