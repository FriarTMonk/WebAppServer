import { IsString, IsNotEmpty, IsBoolean, IsOptional, MaxLength } from 'class-validator';

export class UpdateSessionNoteDto {
  @IsString()
  @IsOptional()
  @MaxLength(10000, { message: 'Note content cannot exceed 10,000 characters' })
  content?: string;

  @IsBoolean()
  @IsOptional()
  isPrivate?: boolean;
}
