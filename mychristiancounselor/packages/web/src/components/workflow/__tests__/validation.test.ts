import { validateStep1, validateStep2, validateStep3, validateStep4 } from '../validation';
import { WorkflowWizardState } from '../types';

describe('Workflow Validation', () => {
  describe('validateStep1', () => {
    it('requires name with at least 3 characters', () => {
      const state: Partial<WorkflowWizardState> = {
        name: 'ab',
        description: '',
      };

      const errors = validateStep1(state as WorkflowWizardState);

      expect(errors.name).toBe('Name must be at least 3 characters');
    });

    it('enforces 100 character limit for name', () => {
      const state: Partial<WorkflowWizardState> = {
        name: 'a'.repeat(101),
        description: '',
      };

      const errors = validateStep1(state as WorkflowWizardState);

      expect(errors.name).toBe('Name must be 100 characters or less');
    });

    it('passes with valid name', () => {
      const state: Partial<WorkflowWizardState> = {
        name: 'Valid Workflow Name',
        description: '',
      };

      const errors = validateStep1(state as WorkflowWizardState);

      expect(errors.name).toBeUndefined();
    });
  });

  describe('validateStep2', () => {
    it('requires trigger selection', () => {
      const state: Partial<WorkflowWizardState> = {
        trigger: null,
      };

      const errors = validateStep2(state as WorkflowWizardState);

      expect(errors.trigger).toBe('Please select a trigger type');
    });

    it('passes with valid trigger', () => {
      const state: Partial<WorkflowWizardState> = {
        trigger: {
          event: 'assessment_completed',
          name: 'Assessment Completed',
          description: 'Test',
        },
      };

      const errors = validateStep2(state as WorkflowWizardState);

      expect(errors.trigger).toBeUndefined();
    });
  });

  describe('validateStep4', () => {
    it('requires at least one action', () => {
      const state: Partial<WorkflowWizardState> = {
        actions: [],
      };

      const errors = validateStep4(state as WorkflowWizardState);

      expect(errors.actions).toBe('At least one action is required');
    });

    it('enforces maximum of 10 actions', () => {
      const state: Partial<WorkflowWizardState> = {
        actions: Array(11).fill({ type: 'send_email' }),
      };

      const errors = validateStep4(state as WorkflowWizardState);

      expect(errors.actions).toBe('Maximum 10 actions allowed');
    });
  });
});
