export class BookListItemDto {
  id: string;
  title: string;
  author: string;
  publisher?: string;
  publicationYear?: number;
  description?: string;
  coverImageUrl?: string;
  biblicalAlignmentScore?: number;
  visibilityTier?: string;
  genreTag?: string;
  matureContent: boolean;
  endorsementCount: number;
}
