import { ReadingListItemDto } from './reading-list-item.dto';

export class ReadingListResponseDto {
  items: ReadingListItemDto[];
  total: number;
}
