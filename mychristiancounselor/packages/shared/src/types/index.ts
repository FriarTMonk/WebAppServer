export interface Session {
  id: string;
  userId: string | null;
  title: string;
  messages: Message[];
  status: 'active' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  scriptureReferences: ScriptureReference[];
  timestamp: Date;
}

// Bible translation type - supports 4 major English translations
export type BibleTranslation = 'NIV' | 'NASB' | 'NKJV' | 'ESV';

// Translation metadata interface
export interface TranslationInfo {
  code: BibleTranslation;
  name: string;
  fullName: string;
  description: string;
  yearPublished?: number;
  characteristics?: string[];
}

export interface ScriptureReference {
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd?: number;
  translation: BibleTranslation;
  text: string;
}

export interface CounselRequest {
  sessionId: string;
  message: string;
  preferredTranslation?: BibleTranslation; // Optional, defaults to NIV
}

export interface CounselResponse {
  sessionId: string;
  message: Message;
  requiresClarification: boolean;
  clarifyingQuestion?: string;
  isCrisisDetected?: boolean;
  crisisResources?: CrisisResource[];
  isGriefDetected?: boolean;
  griefResources?: GriefResource[];
}

export interface CrisisResource {
  name: string;
  contact: string;
  description: string;
}

export interface GriefResource {
  name: string;
  contact: string;
  description: string;
}
