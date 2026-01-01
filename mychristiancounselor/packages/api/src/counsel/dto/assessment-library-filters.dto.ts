import { IsOptional, IsEnum } from 'class-validator';

export class AssessmentLibraryFiltersDto {
  @IsOptional()
  @IsEnum(['custom_assessment', 'custom_questionnaire'])
  type?: 'custom_assessment' | 'custom_questionnaire';
}
