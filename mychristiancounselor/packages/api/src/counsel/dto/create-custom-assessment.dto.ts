import { IsString, IsEnum, IsOptional, IsBoolean, IsNumber, IsArray, ValidateNested, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export enum QuestionType {
  MULTIPLE_CHOICE_SINGLE = 'multiple_choice_single',
  MULTIPLE_CHOICE_MULTI = 'multiple_choice_multi',
  TEXT_SHORT = 'text_short',
  TEXT_LONG = 'text_long',
  RATING_SCALE = 'rating_scale',
  YES_NO = 'yes_no',
}

export class RatingScaleDto {
  @IsNumber()
  @Min(0)
  min: number;

  @IsNumber()
  @Min(1)
  max: number;

  @IsOptional()
  labels?: Record<number, string>;
}

export class QuestionDto {
  @IsString()
  @MinLength(1)
  id: string;

  @IsString()
  @MinLength(1)
  text: string;

  @IsEnum(QuestionType)
  type: QuestionType;

  @IsBoolean()
  required: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => RatingScaleDto)
  scale?: RatingScaleDto;

  @IsNumber()
  @Min(0)
  weight: number;

  @IsString()
  @MinLength(1)
  category: string;
}

export class InterpretationRangeDto {
  @IsNumber()
  @Min(0)
  maxPercent: number;

  @IsString()
  @MinLength(1)
  label: string;

  @IsString()
  @MinLength(1)
  description: string;
}

export class CategoryScoringDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InterpretationRangeDto)
  interpretations: InterpretationRangeDto[];
}

export class ScoringRulesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CategoryScoringDto)
  categories: CategoryScoringDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InterpretationRangeDto)
  overallInterpretations: InterpretationRangeDto[];
}

export class CreateCustomAssessmentDto {
  @IsString()
  @MinLength(3)
  name: string;

  @IsEnum(['custom_assessment', 'custom_questionnaire'])
  type: 'custom_assessment' | 'custom_questionnaire';

  @IsOptional()
  @IsString()
  category?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionDto)
  questions: QuestionDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => ScoringRulesDto)
  scoringRules?: ScoringRulesDto;
}
