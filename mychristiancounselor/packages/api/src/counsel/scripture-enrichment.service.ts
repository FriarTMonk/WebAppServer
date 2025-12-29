import { Injectable, Logger } from '@nestjs/common';
import { ScriptureService } from '../scripture/scripture.service';
import { CounselingAiService } from '../ai/counseling-ai.service';
import { ScriptureReference, BibleTranslation } from '@mychristiancounselor/shared';

/**
 * Handles scripture retrieval, enrichment, and reference extraction for counseling sessions
 * Separated from CounselService to follow Single Responsibility Principle
 */
@Injectable()
export class ScriptureEnrichmentService {
  private readonly logger = new Logger(ScriptureEnrichmentService.name);

  constructor(
    private scriptureService: ScriptureService,
    private counselingAi: CounselingAiService,
  ) {}

  /**
   * Retrieve relevant scriptures based on themes
   * Supports both single translation and comparison mode with multiple translations
   */
  async retrieveScripturesByThemes(
    themes: string[],
    preferredTranslation: BibleTranslation,
    comparisonMode?: boolean,
    comparisonTranslations?: BibleTranslation[],
    limit = 3
  ): Promise<ScriptureReference[]> {
    if (comparisonMode && comparisonTranslations && comparisonTranslations.length > 0) {
      // Fetch same verses in multiple translations for proper comparison (with themes)
      return this.scriptureService.retrieveSameVersesInMultipleTranslationsWithThemes(
        themes,
        comparisonTranslations,
        limit
      );
    } else {
      // Single translation mode (with themes)
      return this.scriptureService.retrieveRelevantScripturesWithThemes(
        themes,
        preferredTranslation,
        limit
      );
    }
  }

  /**
   * Extract scripture references from AI response and enrich with related verses
   * Tags each verse with its source: 'ai-cited', 'related', or 'theme'
   *
   * @param aiContent - The AI-generated response text
   * @param preferredTranslation - The Bible translation to use
   * @param themeBasedScriptures - Fallback scriptures if no references extracted
   * @returns Array of scripture references with source tags
   */
  async enrichResponseWithScriptures(
    aiContent: string,
    preferredTranslation: BibleTranslation,
    themeBasedScriptures: ScriptureReference[]
  ): Promise<ScriptureReference[]> {
    // Extract scripture references from AI response
    const extractedRefs = this.counselingAi.extractScriptureReferences(aiContent);

    this.logger.log(`Scripture extraction: found ${extractedRefs.length} references in AI response`);
    if (extractedRefs.length > 0) {
      this.logger.log(`Extracted references: ${JSON.stringify(extractedRefs)}`);
    }

    if (extractedRefs.length === 0) {
      // No verses extracted - fall back to theme-based scriptures
      this.logger.log('No scripture references extracted from AI response, using theme-based scriptures');
      return themeBasedScriptures.map(s => ({ ...s, source: 'theme' as const }));
    }

    // Fetch and enrich each extracted reference with related verses
    const enrichedVerses = await this.fetchExtractedReferencesWithRelated(
      extractedRefs,
      preferredTranslation
    );

    if (enrichedVerses.length === 0) {
      // All extracted references failed to fetch - fall back to theme-based
      this.logger.warn('All extracted scripture references failed to fetch, using theme-based scriptures');
      return themeBasedScriptures.map(s => ({ ...s, source: 'theme' as const }));
    }

    this.logger.log(`Successfully enriched ${enrichedVerses.length} scripture references (${extractedRefs.length} extracted)`);
    return enrichedVerses;
  }

  /**
   * Fetch verses from extracted references and add related verses for context
   * Private helper method
   */
  private async fetchExtractedReferencesWithRelated(
    extractedRefs: Array<{ book: string; chapter: number; verse: number }>,
    preferredTranslation: BibleTranslation
  ): Promise<ScriptureReference[]> {
    const versesForResponse: ScriptureReference[] = [];

    for (const ref of extractedRefs) {
      try {
        // Get the specific verse mentioned by the AI
        const mainVerse = await this.scriptureService.getScriptureByReference(
          ref.book,
          ref.chapter,
          ref.verse,
          preferredTranslation
        );

        if (mainVerse) {
          // Tag as AI-cited
          versesForResponse.push({ ...mainVerse, source: 'ai-cited' as const });

          // Get related verses (nearby context)
          const relatedVerses = await this.scriptureService.getRelatedVerses(
            ref.book,
            ref.chapter,
            ref.verse,
            preferredTranslation,
            2 // Get 2 related verses for each referenced verse
          );

          // Tag related verses
          versesForResponse.push(...relatedVerses.map(v => ({ ...v, source: 'related' as const })));
        }
      } catch (error) {
        // If a specific reference can't be found, continue with others
        this.logger.warn(
          `Could not fetch verse ${ref.book} ${ref.chapter}:${ref.verse}`,
          error
        );
      }
    }

    return versesForResponse;
  }
}
