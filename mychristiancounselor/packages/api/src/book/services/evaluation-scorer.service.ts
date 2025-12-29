import { Injectable, Logger } from '@nestjs/common';
import { IEvaluationScorer, EvaluationInput, EvaluationResult } from '@mychristiancounselor/shared';
import { resourcesConfig } from '../../config/resources.config';
import { BedrockService } from '../../ai/bedrock.service';

@Injectable()
export class EvaluationScorerService implements IEvaluationScorer {
  private readonly logger = new Logger(EvaluationScorerService.name);

  constructor(private readonly bedrock: BedrockService) {}

  async evaluate(input: EvaluationInput & { useEscalationModel?: boolean }): Promise<EvaluationResult> {
    this.logger.log(`Evaluating book: ${input.metadata.title}`);

    // Use escalation model (Opus) if requested, otherwise primary (Sonnet)
    const model = input.useEscalationModel ? 'opus' : 'sonnet';
    const modelConfig = input.useEscalationModel
      ? resourcesConfig.aiEvaluation.models.escalation
      : resourcesConfig.aiEvaluation.models.primary;

    // Build prompt with variable interpolation
    const prompt = this.buildPrompt(input);

    try {
      // Use Bedrock's jsonCompletion for structured output
      const parsed = await this.bedrock.jsonCompletion(
        model,
        [{ role: 'user', content: prompt }],
        {
          max_tokens: modelConfig.maxTokens,
          temperature: modelConfig.temperature,
        }
      );

      const result = this.parseJsonResult(parsed);

      return {
        ...result,
        modelUsed: modelConfig.name,
        analysisLevel: this.mapContentTypeToAnalysisLevel(input.contentType),
      };
    } catch (error) {
      this.logger.error(`Evaluation failed: ${error.message}`);
      throw error;
    }
  }

  private mapContentTypeToAnalysisLevel(contentType: 'description' | 'summary' | 'full_text'): 'isbn_summary' | 'pdf_summary' | 'full_text' {
    // Map internal content types to Prisma enum values
    switch (contentType) {
      case 'description':
        return 'isbn_summary'; // Description comes from ISBN metadata
      case 'summary':
        return 'pdf_summary';
      case 'full_text':
        return 'full_text';
      default:
        return 'isbn_summary'; // Safe fallback
    }
  }

  private buildPrompt(input: EvaluationInput): string {
    const { basePrompt } = resourcesConfig.aiEvaluation;

    // Simple template interpolation
    return basePrompt
      .replace('{{title}}', input.metadata.title)
      .replace('{{author}}', input.metadata.author)
      .replace('{{genre}}', input.genre || 'Unknown')
      .replace('{{content}}', input.content);
  }

  private parseJsonResult(parsed: any): Omit<EvaluationResult, 'modelUsed' | 'analysisLevel'> {
    return {
      score: parsed.biblicalAlignmentScore,
      genreTag: parsed.genreTag || 'general', // Extract genre from AI response
      summary: parsed.theologicalSummary,
      doctrineCategoryScores: parsed.doctrineCategoryScores || [],
      denominationalTags: parsed.denominationalTags || [],
      matureContent: parsed.matureContent || false,
      matureContentReason: parsed.matureContentReason,
      strengths: parsed.theologicalStrengths || [],
      concerns: parsed.theologicalConcerns || [],
      reasoning: parsed.scoringReasoning || '',
      scripture: parsed.scriptureComparisonNotes || '',
    };
  }
}
