import { ConditionConfig } from './types';

export function getDefaultConditions(triggerEvent: string): ConditionConfig {
  switch (triggerEvent) {
    case 'assessment_completed':
      return {};

    case 'score_threshold_exceeded':
      return {
        assessmentType: '',
        operator: '>',
        threshold: 15,
      };

    case 'task_overdue':
      return {
        daysOverdue: 1,
      };

    case 'conversation_stale':
      return {
        daysWithoutResponse: 3,
      };

    case 'wellness_pattern':
      return {
        patternType: '',
        severity: 'medium',
      };

    case 'crisis_keyword':
      return {
        keywords: '',
        matchType: 'any',
      };

    case 'member_inactive':
      return {
        daysInactive: 7,
      };

    case 'subscription_expiring':
      return {
        daysBeforeExpiration: 7,
      };

    default:
      return {};
  }
}
