import { IsString, IsOptional, IsDateString, MaxLength } from 'class-validator';

export class AssignCustomAssessmentDto {
  @IsString({ message: 'Member ID must be a string' })
  memberId: string;

  @IsOptional()
  @IsDateString({}, { message: 'Due date must be a valid ISO date string' })
  dueDate?: string;

  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  @MaxLength(1000, { message: 'Notes must not exceed 1000 characters' })
  notes?: string;
}
