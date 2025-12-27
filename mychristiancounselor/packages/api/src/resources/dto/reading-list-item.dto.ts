export class ReadingListItemDto {
  id: string;
  bookId: string;
  status: 'want_to_read' | 'currently_reading' | 'finished';
  progress: number | null;
  notes: string | null;
  rating: number | null;
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
