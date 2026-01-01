import { IsString, IsOptional, IsBoolean, IsArray, ValidateNested, MinLength, MaxLength, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';
import { QuestionDto, ScoringRulesDto } from './create-custom-assessment.dto';

export class UpdateCustomAssessmentDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
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
