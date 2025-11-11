import { Injectable } from '@nestjs/common';
import { ScriptureReference } from '@mychrisiancounselor/shared';
import * as verses from './data/niv-verses.json';

interface ScriptureVerse {
  book: string;
  chapter: number;
  verse: number;
  text: string;
  translation: string;
}

@Injectable()
export class ScriptureService {
  private verses: ScriptureVerse[] = verses as ScriptureVerse[];

  /**
   * Simple keyword-based scripture retrieval for MVP
   * Phase 2 will use proper vector embeddings
   */
  async retrieveRelevantScriptures(
    query: string,
    limit: number = 3
  ): Promise<ScriptureReference[]> {
    const keywords = this.extractKeywords(query.toLowerCase());

    const scored = this.verses.map((verse) => {
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
      return this.getDefaultVerses(limit);
    }

    return topVerses.map((v) => this.toScriptureReference(v));
  }

  private extractKeywords(text: string): string[] {
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'can', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your', 'his', 'her', 'its', 'our', 'their']);

    return text
      .split(/\s+/)
      .filter((word) => word.length > 3 && !stopWords.has(word));
  }

  private getDefaultVerses(limit: number): ScriptureReference[] {
    // Return most common encouraging verses
    return this.verses
      .slice(0, limit)
      .map((v) => this.toScriptureReference(v));
  }

  private toScriptureReference(verse: ScriptureVerse): ScriptureReference {
    return {
      book: verse.book,
      chapter: verse.chapter,
      verseStart: verse.verse,
      translation: 'NIV',
      text: verse.text,
    };
  }

  async getScriptureByReference(
    book: string,
    chapter: number,
    verse: number
  ): Promise<ScriptureReference | null> {
    const found = this.verses.find(
      (v) =>
        v.book.toLowerCase() === book.toLowerCase() &&
        v.chapter === chapter &&
        v.verse === verse
    );

    return found ? this.toScriptureReference(found) : null;
  }
}
