import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class ResolveTicketDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(20, { message: 'Resolution must be at least 20 characters' })
  @MaxLength(2000, { message: 'Resolution must not exceed 2000 characters' })
  resolution: string;
}
