export enum QuestionType {
  MULTIPLE_CHOICE_SINGLE = 'multiple_choice_single',
  MULTIPLE_CHOICE_MULTI = 'multiple_choice_multi',
  TEXT_SHORT = 'text_short',
  TEXT_LONG = 'text_long',
  RATING_SCALE = 'rating_scale',
  YES_NO = 'yes_no',
}

export interface RatingScale {
  min: number;
  max: number;
  labels?: Record<number, string>;
}

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  required: boolean;
  options?: string[];
  scale?: RatingScale;
  weight: number;
  category: string;
}

export interface InterpretationRange {
  maxPercent: number;
  label: string;
  description: string;
}

export interface CategoryScoring {
  name: string;
  interpretations: InterpretationRange[];
}

export interface ScoringRules {
  categories: CategoryScoring[];
  overallInterpretations: InterpretationRange[];
}

export interface CustomAssessment {
  id: string;
  name: string;
  type: 'custom_assessment' | 'custom_questionnaire';
  category?: string;
  questions: Question[];
  scoringRules?: ScoringRules;
  organizationId?: string;
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  createdByUser?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}
