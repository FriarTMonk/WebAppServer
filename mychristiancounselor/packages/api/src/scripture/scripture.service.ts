import { Injectable } from '@nestjs/common';
import { BibleTranslation, ScriptureReference, DEFAULT_TRANSLATION } from '@mychristiancounselor/shared';
import { PrismaService } from '../prisma/prisma.service';
import { TranslationService } from './translation.service';
import * as versesData from './data/niv-verses.json';

interface ScriptureVerse {
  book: string;
  chapter: number;
  verse: number;
  text: string;
  translation: string;
}

@Injectable()
export class ScriptureService {
  // Fallback to in-memory verses if database is empty
  private fallbackVerses: ScriptureVerse[] = (versesData as any).default || (versesData as ScriptureVerse[]);

  constructor(
    private prisma: PrismaService,
    private translationService: TranslationService,
  ) {}

  /**
   * Retrieve relevant scriptures with theological themes
   * Each scripture will be tagged with its matching theme
   */
  async retrieveRelevantScripturesWithThemes(
    themes: string[],
    translation: BibleTranslation = DEFAULT_TRANSLATION,
    limit: number = 3
  ): Promise<ScriptureReference[]> {
    // Validate translation
    const validTranslation = await this.translationService.validateTranslation(translation);

    // Check if translation has verse data in database
    const hasData = await this.translationService.hasVerseData(validTranslation);

    const scriptures: ScriptureReference[] = [];

    // Get verses for each theme (limit per theme to ensure variety)
    const versesPerTheme = Math.ceil(limit / themes.length);

    for (const theme of themes) {
      let themeVerses: ScriptureReference[];

      if (hasData) {
        themeVerses = await this.searchDatabaseVerses(theme, validTranslation, versesPerTheme);
      } else {
        themeVerses = await this.searchFallbackVerses(theme, versesPerTheme);
      }

      // Attach theme to each scripture
      themeVerses.forEach((verse) => {
        verse.theme = theme;
      });

      scriptures.push(...themeVerses);
    }

    // Return up to limit verses
    return scriptures.slice(0, limit);
  }

  /**
   * Simple keyword-based scripture retrieval for MVP
   * Phase 2 will use proper vector embeddings
   */
  async retrieveRelevantScriptures(
    query: string,
    translation: BibleTranslation = DEFAULT_TRANSLATION,
    limit: number = 3
  ): Promise<ScriptureReference[]> {
    // Validate translation
    const validTranslation = await this.translationService.validateTranslation(translation);

    // Check if translation has verse data in database
    const hasData = await this.translationService.hasVerseData(validTranslation);

    if (hasData) {
      // Use database verses
      return this.searchDatabaseVerses(query, validTranslation, limit);
    } else {
      // Fallback to in-memory verses (NIV only for now)
      return this.searchFallbackVerses(query, limit);
    }
  }

  /**
   * Search verses in database
   */
  private async searchDatabaseVerses(
    query: string,
    translation: BibleTranslation,
    limit: number
  ): Promise<ScriptureReference[]> {
    const keywords = this.extractKeywords(query.toLowerCase());

    // Get all verses for the translation
    const verses = await this.prisma.bibleVerse.findMany({
      where: { translationCode: translation },
    });

    // Score verses based on keyword matches
    const scored = verses.map((verse) => {
      const verseText = verse.text.toLowerCase();
      const score = keywords.reduce((acc, keyword) => {
        return acc + (verseText.includes(keyword) ? 1 : 0);
      }, 0);

      return { verse, score };
    });

    // Sort by score and take top N
    const topVerses = scored
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    // If no matches, return default verses
    if (topVerses.length === 0) {
      return this.getDefaultDatabaseVerses(translation, limit);
    }

    return topVerses.map((item) => ({
      book: item.verse.book,
      chapter: item.verse.chapter,
      verseStart: item.verse.verse,
      translation: item.verse.translationCode as BibleTranslation,
      text: item.verse.text,
      strongs: item.verse.strongs as any[], // Strong's numbers from JSONB field
    }));
  }

  /**
   * Search fallback in-memory verses (NIV only)
   */
  private async searchFallbackVerses(
    query: string,
    limit: number
  ): Promise<ScriptureReference[]> {
    const keywords = this.extractKeywords(query.toLowerCase());

    const scored = this.fallbackVerses.map((verse) => {
      const verseText = verse.text.toLowerCase();
      const score = keywords.reduce((acc, keyword) => {
        return acc + (verseText.includes(keyword) ? 1 : 0);
      }, 0);

      return { verse, score };
    });

    // Sort by score and take top N
    const topVerses = scored
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item) => item.verse);

    // If no matches, return default verses
    if (topVerses.length === 0) {
      return this.getDefaultFallbackVerses(limit);
    }

    return topVerses.map((v) => this.toScriptureReference(v));
  }

  private extractKeywords(text: string): string[] {
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'can', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your', 'his', 'her', 'its', 'our', 'their']);

    return text
      .split(/\s+/)
      .filter((word) => word.length > 3 && !stopWords.has(word));
  }

  private async getDefaultDatabaseVerses(
    translation: BibleTranslation,
    limit: number
  ): Promise<ScriptureReference[]> {
    // Return most common encouraging verses from database
    const verses = await this.prisma.bibleVerse.findMany({
      where: { translationCode: translation },
      take: limit,
    });

    return verses.map((v) => ({
      book: v.book,
      chapter: v.chapter,
      verseStart: v.verse,
      translation: v.translationCode as BibleTranslation,
      text: v.text,
      strongs: v.strongs as any[],
    }));
  }

  private getDefaultFallbackVerses(limit: number): ScriptureReference[] {
    // Return most common encouraging verses from fallback data
    return this.fallbackVerses
      .slice(0, limit)
      .map((v) => this.toScriptureReference(v));
  }

  private toScriptureReference(verse: ScriptureVerse): ScriptureReference {
    return {
      book: verse.book,
      chapter: verse.chapter,
      verseStart: verse.verse,
      translation: verse.translation as BibleTranslation || DEFAULT_TRANSLATION,
      text: verse.text,
    };
  }

  /**
   * Get a specific scripture by reference
   * Supports multiple translations
   */
  async getScriptureByReference(
    book: string,
    chapter: number,
    verse: number,
    translation: BibleTranslation = DEFAULT_TRANSLATION
  ): Promise<ScriptureReference | null> {
    // Validate translation
    const validTranslation = await this.translationService.validateTranslation(translation);

    // Check if translation has verse data in database
    const hasData = await this.translationService.hasVerseData(validTranslation);

    if (hasData) {
      // Query database
      const found = await this.prisma.bibleVerse.findUnique({
        where: {
          translationCode_book_chapter_verse: {
            translationCode: validTranslation,
            book,
            chapter,
            verse,
          },
        },
      });

      if (found) {
        return {
          book: found.book,
          chapter: found.chapter,
          verseStart: found.verse,
          translation: found.translationCode as BibleTranslation,
          text: found.text,
          strongs: found.strongs as any[],
        };
      }
    } else {
      // Fallback to in-memory verses
      const found = this.fallbackVerses.find(
        (v) =>
          v.book.toLowerCase() === book.toLowerCase() &&
          v.chapter === chapter &&
          v.verse === verse
      );

      return found ? this.toScriptureReference(found) : null;
    }

    return null;
  }

  /**
   * Get a verse in multiple translations
   * Returns a map of translation code to verse text
   */
  async getVerseInMultipleTranslations(
    book: string,
    chapter: number,
    verse: number,
    translations: BibleTranslation[] = ['NIV', 'NASB', 'NKJV', 'ESV']
  ): Promise<Record<string, ScriptureReference>> {
    const result: Record<string, ScriptureReference> = {};

    for (const translation of translations) {
      const scripture = await this.getScriptureByReference(book, chapter, verse, translation);
      if (scripture) {
        result[translation] = scripture;
      }
    }

    return result;
  }

  /**
   * Search verses across multiple translations
   */
  async searchAcrossTranslations(
    query: string,
    translations: BibleTranslation[] = ['NIV', 'NASB', 'NKJV', 'ESV'],
    limitPerTranslation: number = 2
  ): Promise<Record<string, ScriptureReference[]>> {
    const result: Record<string, ScriptureReference[]> = {};

    for (const translation of translations) {
      const verses = await this.retrieveRelevantScriptures(query, translation, limitPerTranslation);
      result[translation] = verses;
    }

    return result;
  }

  /**
   * Retrieve the same verses in multiple translations for comparison (with themes)
   * Finds relevant verses using themes, then fetches same verses in other translations
   */
  async retrieveSameVersesInMultipleTranslationsWithThemes(
    themes: string[],
    translations: BibleTranslation[],
    limit: number = 3
  ): Promise<ScriptureReference[]> {
    if (translations.length === 0) {
      return [];
    }

    // Step 1: Find relevant verses using the first translation and themes
    const primaryTranslation = translations[0];
    const primaryVerses = await this.retrieveRelevantScripturesWithThemes(themes, primaryTranslation, limit);

    // Step 2: For each verse found, fetch it in all other translations (preserving theme)
    const allVerses: ScriptureReference[] = [...primaryVerses];

    for (let i = 1; i < translations.length; i++) {
      const translation = translations[i];

      for (const verse of primaryVerses) {
        const sameVerseInOtherTranslation = await this.getScriptureByReference(
          verse.book,
          verse.chapter,
          verse.verseStart,
          translation
        );

        if (sameVerseInOtherTranslation) {
          // Preserve the theme from the primary verse
          sameVerseInOtherTranslation.theme = verse.theme;
          allVerses.push(sameVerseInOtherTranslation);
        }
      }
    }

    return allVerses;
  }

  /**
   * Retrieve the same verses in multiple translations for comparison
   * Finds relevant verses in first translation, then fetches same verses in other translations
   */
  async retrieveSameVersesInMultipleTranslations(
    query: string,
    translations: BibleTranslation[],
    limit: number = 3
  ): Promise<ScriptureReference[]> {
    if (translations.length === 0) {
      return [];
    }

    // Step 1: Find relevant verses using the first translation
    const primaryTranslation = translations[0];
    const primaryVerses = await this.retrieveRelevantScriptures(query, primaryTranslation, limit);

    // Step 2: For each verse found, fetch it in all other translations
    const allVerses: ScriptureReference[] = [...primaryVerses];

    for (let i = 1; i < translations.length; i++) {
      const translation = translations[i];

      for (const verse of primaryVerses) {
        const sameVerseInOtherTranslation = await this.getScriptureByReference(
          verse.book,
          verse.chapter,
          verse.verseStart,
          translation
        );

        if (sameVerseInOtherTranslation) {
          allVerses.push(sameVerseInOtherTranslation);
        }
      }
    }

    return allVerses;
  }
}
