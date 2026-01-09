import { IsString, IsOptional, IsDateString, MaxLength, IsUUID, IsNotEmpty } from 'class-validator';

export class AssignCustomAssessmentDto {
  @IsUUID('4', { message: 'Member ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Member ID is required' })
  memberId: string;

  @IsOptional()
  @IsDateString({}, { message: 'Due date must be a valid ISO date string' })
  dueDate?: string;

  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  @MaxLength(1000, { message: 'Notes must not exceed 1000 characters' })
  notes?: string;
}
