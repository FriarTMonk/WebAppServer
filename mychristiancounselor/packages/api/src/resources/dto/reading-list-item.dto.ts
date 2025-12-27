export class ReadingListItemDto {
  id: string;
  bookId: string;
  status: string;
  progress: number | null;
  personalNotes: string | null;
  personalRating: number | null;
  dateStarted: string | null;
  dateFinished: string | null;
  addedAt: string;
  updatedAt: string;
  book: {
    id: string;
    title: string;
    author: string;
    coverImageUrl: string | null;
    biblicalAlignmentScore: number | null;
    genreTag: string;
    matureContent: boolean;
  };
}
