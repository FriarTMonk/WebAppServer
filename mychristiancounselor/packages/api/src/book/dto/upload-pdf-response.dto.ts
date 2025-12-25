import { IsString, IsEnum, IsOptional, IsInt, IsDate } from 'class-validator';

export class UploadPdfResponseDto {
  @IsString()
  id: string;

  @IsEnum(['uploaded', 'queued_for_evaluation'])
  status: 'uploaded' | 'queued_for_evaluation';

  @IsString()
  message: string;

  @IsOptional()
  @IsInt()
  pdfFileSize?: number;

  @IsOptional()
  @IsDate()
  pdfUploadedAt?: Date;
}
