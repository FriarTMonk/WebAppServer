import { IsString, IsNotEmpty, IsUUID, IsOptional } from 'class-validator';

export class CounselRequestDto {
  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @IsString()
  @IsNotEmpty()
  message: string;
}
