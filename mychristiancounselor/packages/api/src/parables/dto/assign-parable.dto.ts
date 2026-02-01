import { IsString, IsOptional, IsDateString } from 'class-validator';

export class AssignParableDto {
  @IsString()
  memberId: string;

  @IsString()
  @IsOptional()
  counselorNotes?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;
}

export class SubmitReflectionDto {
  @IsString()
  memberReflection: string;
}
