import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class AssignTicketDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  assignedToId: string;
}
