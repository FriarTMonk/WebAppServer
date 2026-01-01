import { IsString, IsEnum, IsOptional, IsBoolean, IsNumber, IsArray, ValidateNested, Min, Max, MinLength, MaxLength, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';
import { AssessmentType } from '@prisma/client';

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
  // Note: labels validation is handled at service layer to ensure numeric keys match min-max range
  labels?: Record<number, string>;
}

export class QuestionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  id: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  text: string;

  @IsEnum(QuestionType)
  type: QuestionType;

  @IsBoolean()
  required: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
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
  @MaxLength(50)
  category: string;
}

export class InterpretationRangeDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  maxPercent: number;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  label: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  description: string;
}

export class CategoryScoringDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => InterpretationRangeDto)
  interpretations: InterpretationRangeDto[];
}

export class ScoringRulesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => CategoryScoringDto)
  categories: CategoryScoringDto[];

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => InterpretationRangeDto)
  overallInterpretations: InterpretationRangeDto[];
}

export class CreateCustomAssessmentDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @IsEnum(AssessmentType)
  type: AssessmentType.custom_assessment | AssessmentType.custom_questionnaire;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => QuestionDto)
  questions: QuestionDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => ScoringRulesDto)
  scoringRules?: ScoringRulesDto;
}
