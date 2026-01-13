import { WorkflowWizardState } from './types';

export interface ValidationErrors {
  name?: string;
  description?: string;
  trigger?: string;
  conditions?: string;
  actions?: string;
}

export function validateStep1(state: WorkflowWizardState): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!state.name || state.name.trim().length < 3) {
    errors.name = 'Name must be at least 3 characters';
  }

  if (state.name && state.name.length > 100) {
    errors.name = 'Name must be 100 characters or less';
  }

  if (state.description && state.description.length > 500) {
    errors.description = 'Description must be 500 characters or less';
  }

  return errors;
}

export function validateStep2(state: WorkflowWizardState): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!state.trigger || !state.trigger.event) {
    errors.trigger = 'Please select a trigger type';
  }

  return errors;
}

export function validateStep3(state: WorkflowWizardState): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!state.trigger) {
    errors.conditions = 'Trigger must be selected first';
    return errors;
  }

  const { event } = state.trigger;
  const { conditions } = state;

  switch (event) {
    case 'score_threshold_exceeded':
      if (!conditions.assessmentType) {
        errors.conditions = 'Assessment type is required';
      }
      if (!conditions.threshold) {
        errors.conditions = 'Threshold value is required';
      }
      break;

    case 'task_overdue':
      if (!conditions.daysOverdue || conditions.daysOverdue < 1) {
        errors.conditions = 'Days overdue must be at least 1';
      }
      break;

    case 'conversation_stale':
      if (!conditions.daysWithoutResponse || conditions.daysWithoutResponse < 1) {
        errors.conditions = 'Days without response must be at least 1';
      }
      break;

    case 'wellness_pattern':
      if (!conditions.patternType) {
        errors.conditions = 'Pattern type is required';
      }
      break;

    case 'crisis_keyword':
      if (!conditions.keywords || conditions.keywords.trim().length === 0) {
        errors.conditions = 'At least one keyword is required';
      }
      break;

    case 'member_inactive':
      if (!conditions.daysInactive || conditions.daysInactive < 1) {
        errors.conditions = 'Days inactive must be at least 1';
      }
      break;

    case 'subscription_expiring':
      if (!conditions.daysBeforeExpiration || conditions.daysBeforeExpiration < 1) {
        errors.conditions = 'Days before expiration must be at least 1';
      }
      break;
  }

  return errors;
}

export function validateStep4(state: WorkflowWizardState): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!state.actions || state.actions.length === 0) {
    errors.actions = 'At least one action is required';
  }

  if (state.actions && state.actions.length > 10) {
    errors.actions = 'Maximum 10 actions allowed';
  }

  // Validate each action has required fields
  for (const action of state.actions) {
    if (!action.type) {
      errors.actions = 'All actions must have a type selected';
      break;
    }
  }

  return errors;
}

export function validateAllSteps(state: WorkflowWizardState): ValidationErrors {
  return {
    ...validateStep1(state),
    ...validateStep2(state),
    ...validateStep3(state),
    ...validateStep4(state),
  };
}
