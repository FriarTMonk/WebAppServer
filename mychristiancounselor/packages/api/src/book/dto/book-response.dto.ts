export class BookSubmissionResponseDto {
  id: string;
  status: 'pending' | 'existing';
  message: string;
}
