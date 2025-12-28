import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { IEvaluationScorer, EvaluationInput, EvaluationResult } from '@mychristiancounselor/shared';
import { resourcesConfig } from '../../config/resources.config';

@Injectable()
export class EvaluationScorerService implements IEvaluationScorer {
  private readonly logger = new Logger(EvaluationScorerService.name);
  private readonly anthropic: Anthropic;

  constructor(@Optional() @Inject('ANTHROPIC_CLIENT') anthropicClient?: Anthropic) {
    this.anthropic = anthropicClient || new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async evaluate(input: EvaluationInput & { useEscalationModel?: boolean }): Promise<EvaluationResult> {
    this.logger.log(`Evaluating book: ${input.metadata.title}`);

    // Use escalation model (Opus) if requested, otherwise primary (Sonnet)
    const modelConfig = input.useEscalationModel
      ? resourcesConfig.aiEvaluation.models.escalation
      : resourcesConfig.aiEvaluation.models.primary;

    // Build prompt with variable interpolation
    const prompt = this.buildPrompt(input);

    try {
      const response = await this.anthropic.messages.create({
        model: modelConfig.name,
        max_tokens: modelConfig.maxTokens,
        temperature: modelConfig.temperature,
        messages: [{
          role: 'user',
          content: prompt,
        }],
      });

      const result = this.parseResponse(response);

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

  private parseResponse(response: any): Omit<EvaluationResult, 'modelUsed' | 'analysisLevel'> {
    const textContent = response.content.find((block: any) => block.type === 'text');
    if (!textContent) {
      throw new Error('No text content in Claude response');
    }

    // Strip markdown code fences if present (Claude sometimes wraps JSON in ```json ... ```)
    let jsonText = textContent.text.trim();
    if (jsonText.startsWith('```')) {
      // Remove opening fence (```json or ```)
      jsonText = jsonText.replace(/^```(?:json)?\s*\n/, '');
      // Remove closing fence (```)
      jsonText = jsonText.replace(/\n```\s*$/, '');
    }

    // Parse JSON response
    const parsed = JSON.parse(jsonText);

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
