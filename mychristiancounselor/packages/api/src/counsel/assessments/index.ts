import { PHQ9_ASSESSMENT } from './phq9.assessment';
import { GAD7_ASSESSMENT } from './gad7.assessment';

export * from './assessment.types';
export * from './phq9.assessment';
export * from './gad7.assessment';

export const CLINICAL_ASSESSMENTS = {
  'phq-9': PHQ9_ASSESSMENT,
  'gad-7': GAD7_ASSESSMENT,
};

export function getAssessmentById(id: string) {
  return CLINICAL_ASSESSMENTS[id as keyof typeof CLINICAL_ASSESSMENTS];
}
