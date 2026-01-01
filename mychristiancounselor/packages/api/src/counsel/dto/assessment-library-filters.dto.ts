import { IsOptional, IsEnum } from 'class-validator';
import { AssessmentType } from '@prisma/client';

export class AssessmentLibraryFiltersDto {
  @IsOptional()
  @IsEnum(AssessmentType)
  type?: AssessmentType.custom_assessment | AssessmentType.custom_questionnaire;
}
