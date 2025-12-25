export class DoctrineCategoryScoreDto {
  category: string;
  score: number;
  notes?: string;
}

export class PurchaseLinkDto {
  retailer: string;
  url: string;
  isPrimary: boolean;
  price?: string;
}

export class BookDetailDto {
  // Basic book fields
  id: string;
  title: string;
  author: string;
  isbn?: string;
  publisher?: string;
  publicationYear?: number;
  description?: string;
  coverImageUrl?: string;

  // Evaluation data
  evaluationStatus: string;
  biblicalAlignmentScore?: number;
  visibilityTier: string;
  matureContent: boolean;
  evaluatedAt?: Date;

  // Theological analysis
  theologicalSummary?: string;
  scriptureComparisonNotes?: string;
  denominationalTags: string[];
  theologicalStrengths: string[];
  theologicalConcerns: string[];

  // Doctrine scores
  doctrineCategoryScores: DoctrineCategoryScoreDto[];

  // Purchase links
  purchaseLinks: PurchaseLinkDto[];

  // Endorsement count
  endorsementCount: number;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}
