import { ConditionConfig, ActionConfig } from './types';
import { ACTION_TYPES } from './constants';

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

export function getDefaultAction(actionType: string): ActionConfig {
  const type = ACTION_TYPES.find(at => at.type === actionType);
  if (!type) return { type: actionType };

  const defaultAction: ActionConfig = { type: actionType };

  for (const field of type.fields) {
    if (field.type === 'select' && field.options && field.options.length > 0) {
      defaultAction[field.name] = field.options[0].value;
    } else if (field.type === 'number') {
      defaultAction[field.name] = field.min || 1;
    } else {
      defaultAction[field.name] = '';
    }
  }

  return defaultAction;
}
