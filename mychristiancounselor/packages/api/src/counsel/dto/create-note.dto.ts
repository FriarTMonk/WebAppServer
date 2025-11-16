import { IsString, IsBoolean, IsOptional, MaxLength } from 'class-validator';

export class CreateNoteDto {
  @IsString()
  @MaxLength(5000, { message: 'Note content cannot exceed 5000 characters' })
  content: string;

  @IsBoolean()
  @IsOptional()
  isPrivate?: boolean;
}
