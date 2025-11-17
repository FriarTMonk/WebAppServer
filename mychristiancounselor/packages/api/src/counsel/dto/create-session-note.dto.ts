import { IsString, IsNotEmpty, IsUUID, IsBoolean, IsOptional, MaxLength } from 'class-validator';

export class CreateSessionNoteDto {
  @IsUUID()
  @IsNotEmpty()
  sessionId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10000, { message: 'Note content cannot exceed 10,000 characters' })
  content: string;

  @IsBoolean()
  @IsOptional()
  isPrivate?: boolean;
}
