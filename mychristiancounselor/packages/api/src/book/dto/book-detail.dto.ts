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

export class BookEndorsementDto {
  organizationId: string;
  organizationName: string;
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

  // Evaluation reasoning
  scoringReasoning?: string;

  // Purchase links
  purchaseLinks: PurchaseLinkDto[];

  // Endorsements
  endorsements: BookEndorsementDto[];
  endorsementCount: number;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}
