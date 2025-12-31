export interface AssessmentQuestion {
  id: string;
  text: string;
  type: 'scale' | 'multiple_choice' | 'yes_no' | 'text';
  options?: { value: number; label: string }[];
  required: boolean;
}

export interface AssessmentDefinition {
  id: string;
  name: string;
  description: string;
  type: 'clinical' | 'custom';
  questions: AssessmentQuestion[];
  scoringRules: ScoringRules;
}

export interface ScoringRules {
  method: 'sum' | 'average' | 'custom';
  minScore: number;
  maxScore: number;
  severityLevels?: {
    level: string;
    minScore: number;
    maxScore: number;
    description: string;
  }[];
}

export interface AssessmentResponse {
  questionId: string;
  value: number | string;
}

export interface ScoredAssessment {
  totalScore: number;
  severityLevel?: string;
  interpretation?: string;
}
