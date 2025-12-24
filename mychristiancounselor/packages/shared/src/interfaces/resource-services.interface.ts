// Unix principle: Each service has ONE clear interface

export interface IBookMetadataProvider {
  // Does ONE thing: fetch book metadata
  lookup(identifier: string): Promise<BookMetadata | null>;
  supports(identifier: string): boolean;
}

export interface IDuplicateDetector {
  // Does ONE thing: find duplicates
  findDuplicate(metadata: BookMetadata): Promise<string | null>; // Returns bookId or null
}

export interface IVisibilityChecker {
  // Does ONE thing: determine if user can access resource
  canAccess(userId: string, resourceId: string, resourceType: 'book' | 'org'): Promise<boolean>;
}

export interface IEvaluationScorer {
  // Does ONE thing: score book alignment
  evaluate(input: EvaluationInput): Promise<EvaluationResult>;
}

export interface IStorageProvider {
  // Does ONE thing: store/retrieve files
  upload(key: string, data: Buffer, tier: 'active' | 'archived'): Promise<string>;
  download(key: string): Promise<Buffer>;
  move(key: string, fromTier: 'active' | 'archived', toTier: 'active' | 'archived'): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface INotificationService {
  // Does ONE thing: send notifications
  send<T = Record<string, unknown>>(to: string, template: string, data: T): Promise<void>;
}

export interface BookMetadata {
  title: string;
  author: string;
  isbn?: string;
  publisher?: string;
  publicationYear?: number;
  description?: string;
  coverImageUrl?: string;
}

export interface EvaluationInput {
  metadata: BookMetadata;
  content: string; // Description or full text
  contentType: 'description' | 'summary' | 'full_text';
  genre?: string;
}

export interface EvaluationResult {
  score: number; // 0-100
  summary: string;
  doctrineCategoryScores: Array<{ category: string; score: number; notes?: string }>;
  denominationalTags: string[];
  matureContent: boolean;
  matureContentReason?: string;
  strengths: string[];
  concerns: string[];
  reasoning: string;
  scripture: string;
  modelUsed: string;
  analysisLevel: string;
}
