import { IsString, IsNotEmpty, IsEnum } from 'class-validator';

export class LinkTicketsDto {
  @IsString()
  @IsNotEmpty()
  targetTicketId: string;

  @IsEnum(['duplicate', 'related', 'blocks', 'blocked_by'])
  relationship: string;
}
