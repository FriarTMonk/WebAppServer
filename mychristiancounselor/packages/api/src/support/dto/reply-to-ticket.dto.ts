import { IsString, IsNotEmpty, MaxLength, MinLength, IsBoolean, IsOptional } from 'class-validator';

export class ReplyToTicketDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(5000)
  content: string;

  @IsOptional()
  @IsBoolean()
  isInternal?: boolean = false;
}
