import { IsString, IsBoolean, IsOptional, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateNoteDto {
  @IsString()
  @IsNotEmpty({ message: 'Note content cannot be empty' })
  @MaxLength(5000, { message: 'Note content cannot exceed 5000 characters' })
  content: string;

  @IsBoolean()
  @IsOptional()
  isPrivate?: boolean;
}
