import { Injectable } from '@nestjs/common';
import { StrongsDefinition } from '@mychristiancounselor/shared';
import * as greekDefinitions from './data/strongs/greek-definitions.json';
import * as hebrewDefinitions from './data/strongs/hebrew-definitions.json';

@Injectable()
export class StrongsService {
  // In-memory cache of Strong's definitions
  private greekDict: Record<string, StrongsDefinition>;
  private hebrewDict: Record<string, StrongsDefinition>;

  constructor() {
    // Load Greek definitions
    this.greekDict = greekDefinitions as Record<string, StrongsDefinition>;
    // Load Hebrew definitions
    this.hebrewDict = hebrewDefinitions as Record<string, StrongsDefinition>;
  }

  /**
   * Get a single Strong's definition by number
   * @param strongsNumber - e.g., "G26" or "H7225"
   * @returns StrongsDefinition or null if not found
   */
  getDefinition(strongsNumber: string): StrongsDefinition | null {
    const normalized = strongsNumber.toUpperCase().trim();

    // Check Greek dictionary
    if (normalized.startsWith('G')) {
      return this.greekDict[normalized] || null;
    }

    // Check Hebrew dictionary
    if (normalized.startsWith('H')) {
      return this.hebrewDict[normalized] || null;
    }

    return null;
  }

  /**
   * Get multiple Strong's definitions at once
   * @param strongsNumbers - Array of Strong's numbers
   * @returns Record of Strong's numbers to definitions
   */
  getDefinitions(strongsNumbers: string[]): Record<string, StrongsDefinition> {
    const result: Record<string, StrongsDefinition> = {};

    for (const num of strongsNumbers) {
      const def = this.getDefinition(num);
      if (def) {
        result[num] = def;
      }
    }

    return result;
  }

  /**
   * Search Strong's definitions by keyword
   * @param keyword - Search term
   * @param limit - Maximum results to return
   * @returns Array of matching definitions
   */
  searchDefinitions(keyword: string, limit: number = 20): StrongsDefinition[] {
    const searchTerm = keyword.toLowerCase();
    const results: StrongsDefinition[] = [];

    // Search Greek dictionary
    for (const def of Object.values(this.greekDict)) {
      if (results.length >= limit) break;

      // Search in definition, transliteration, and usage
      if (
        def.definition.toLowerCase().includes(searchTerm) ||
        def.transliteration.toLowerCase().includes(searchTerm) ||
        def.usage?.toLowerCase().includes(searchTerm)
      ) {
        results.push(def);
      }
    }

    // Search Hebrew dictionary
    for (const def of Object.values(this.hebrewDict)) {
      if (results.length >= limit) break;

      // Search in definition, transliteration, and usage
      if (
        def.definition.toLowerCase().includes(searchTerm) ||
        def.transliteration.toLowerCase().includes(searchTerm) ||
        def.usage?.toLowerCase().includes(searchTerm)
      ) {
        results.push(def);
      }
    }

    return results;
  }

  /**
   * Get statistics about the loaded dictionaries
   */
  getStatistics(): {
    greekCount: number;
    hebrewCount: number;
    totalCount: number;
  } {
    const greekCount = Object.keys(this.greekDict).length;
    const hebrewCount = Object.keys(this.hebrewDict).length;

    return {
      greekCount,
      hebrewCount,
      totalCount: greekCount + hebrewCount,
    };
  }
}
