import { Injectable } from '@nestjs/common';
import { BibleTranslation, TranslationInfo, TRANSLATIONS, DEFAULT_TRANSLATION } from '@mychristiancounselor/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TranslationService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all available translations with metadata
   */
  async getAvailableTranslations(): Promise<TranslationInfo[]> {
    const translations = await this.prisma.bibleTranslation.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    // Map database records to TranslationInfo format
    return translations.map((t) => ({
      code: t.code as BibleTranslation,
      name: t.name,
      fullName: t.fullName,
      description: t.description || '',
      yearPublished: TRANSLATIONS[t.code as BibleTranslation]?.yearPublished,
      characteristics: TRANSLATIONS[t.code as BibleTranslation]?.characteristics || [],
    }));
  }

  /**
   * Get translation info by code
   */
  async getTranslationInfo(code: BibleTranslation): Promise<TranslationInfo | null> {
    const translation = await this.prisma.bibleTranslation.findUnique({
      where: { code },
    });

    if (!translation) {
      return null;
    }

    return {
      code: translation.code as BibleTranslation,
      name: translation.name,
      fullName: translation.fullName,
      description: translation.description || '',
      yearPublished: TRANSLATIONS[code]?.yearPublished,
      characteristics: TRANSLATIONS[code]?.characteristics || [],
    };
  }

  /**
   * Check if a translation is available
   */
  async isTranslationAvailable(code: string): Promise<boolean> {
    const translation = await this.prisma.bibleTranslation.findUnique({
      where: { code },
    });

    return translation?.isActive ?? false;
  }

  /**
   * Get the default translation
   */
  getDefaultTranslation(): BibleTranslation {
    return DEFAULT_TRANSLATION;
  }

  /**
   * Validate and normalize translation code
   * Returns valid translation code or default if invalid
   */
  async validateTranslation(code?: string): Promise<BibleTranslation> {
    if (!code || typeof code !== 'string') {
      return DEFAULT_TRANSLATION;
    }

    const upperCode = code.toUpperCase();
    const isValid = await this.isTranslationAvailable(upperCode);

    return isValid ? (upperCode as BibleTranslation) : DEFAULT_TRANSLATION;
  }

  /**
   * Get verse count for a specific translation
   * Useful for checking if translation data is loaded
   */
  async getVerseCount(translationCode: BibleTranslation): Promise<number> {
    return this.prisma.bibleVerse.count({
      where: { translationCode },
    });
  }

  /**
   * Check if translation has verse data loaded
   */
  async hasVerseData(translationCode: BibleTranslation): Promise<boolean> {
    const count = await this.getVerseCount(translationCode);
    return count > 0;
  }
}
