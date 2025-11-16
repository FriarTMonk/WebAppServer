import { IsString, IsBoolean, IsOptional, MaxLength } from 'class-validator';

export class UpdateNoteDto {
  @IsString()
  @IsOptional()
  @MaxLength(5000, { message: 'Note content cannot exceed 5000 characters' })
  content?: string;

  @IsBoolean()
  @IsOptional()
  isPrivate?: boolean;
}
