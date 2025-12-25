import { BookListItemDto } from './book-list-item.dto';

export class BookListResponseDto {
  books: BookListItemDto[];
  total: number;
  skip: number;
  take: number;
}
