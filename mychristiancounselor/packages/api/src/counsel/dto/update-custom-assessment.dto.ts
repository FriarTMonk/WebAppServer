import { IsString, IsOptional, IsBoolean, IsArray, ValidateNested, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { QuestionDto, ScoringRulesDto } from './create-custom-assessment.dto';

export class UpdateCustomAssessmentDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  name?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionDto)
  questions?: QuestionDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => ScoringRulesDto)
  scoringRules?: ScoringRulesDto;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
