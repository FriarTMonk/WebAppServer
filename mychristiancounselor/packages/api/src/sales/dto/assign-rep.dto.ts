import { IsUUID } from 'class-validator';

export class AssignRepDto {
  @IsUUID()
  assignedToId: string;
}
