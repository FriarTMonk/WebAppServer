'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { WorkflowWizardState, TriggerConfig, ConditionConfig } from './types';
import { Step1BasicInfo } from './Step1BasicInfo';
import { Step2SelectTrigger } from './Step2SelectTrigger';
import { Step3ConfigureConditions } from './Step3ConfigureConditions';
import { Step4AddActions } from './Step4AddActions';
import { Step5ReviewActivate } from './Step5ReviewActivate';
import { validateStep1, validateStep2, validateStep3, validateStep4, ValidationErrors } from './validation';
import { testWorkflow, createWorkflow } from './api';
import { showToast } from '@/components/Toast';
import { saveDraft, loadDraft, clearDraft } from './persistence';

interface WorkflowWizardProps {
  organizationId: string;
  onClose?: () => void;
}

export function WorkflowWizard({ organizationId, onClose }: WorkflowWizardProps) {
  const router = useRouter();
  const [state, setState] = useState<WorkflowWizardState>({
    currentStep: 1,
    name: '',
    description: '',
    organizationId,
    isActive: true,
    trigger: null,
    conditions: {},
    actions: [],
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [testing, setTesting] = useState(false);
  const [creating, setCreating] = useState(false);

  // Load draft on mount
  useEffect(() => {
    const draft = loadDraft();
    if (draft && draft.organizationId === organizationId) {
      // Show confirmation dialog
      if (confirm('Would you like to restore your previous workflow draft?')) {
        setState(draft);
      } else {
        clearDraft();
      }
    }
  }, [organizationId]);

  // Save draft on state change
  useEffect(() => {
    if (state.name || state.trigger || state.actions.length > 0) {
      saveDraft(state);
    }
  }, [state]);

  const handleNext = () => {
    // Validate current step
    let stepErrors: ValidationErrors = {};

    switch (state.currentStep) {
      case 1:
        stepErrors = validateStep1(state);
        break;
      case 2:
        stepErrors = validateStep2(state);
        break;
      case 3:
        stepErrors = validateStep3(state);
        break;
      case 4:
        stepErrors = validateStep4(state);
        break;
    }

    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }

    setErrors({});
    setState({ ...state, currentStep: (state.currentStep + 1) as any });
  };

  const handlePrevious = () => {
    setErrors({});
    setState({ ...state, currentStep: (state.currentStep - 1) as any });
  };

  const handleTriggerChange = (trigger: TriggerConfig, defaultConditions?: ConditionConfig) => {
    setState({
      ...state,
      trigger,
      conditions: defaultConditions !== undefined ? defaultConditions : state.conditions,
    });
  };

  const handleTest = async () => {
    setTesting(true);
    const workflowData = {
      name: state.name,
      description: state.description,
      organizationId: state.organizationId,
      trigger: {
        event: state.trigger?.event,
        ...state.conditions,
      },
      actions: state.actions,
      isActive: state.isActive,
    };

    const result = await testWorkflow(workflowData);

    if (result.success) {
      showToast(result.message, 'success');
    } else {
      showToast(result.message, 'error');
    }

    setTesting(false);
  };

  const handleCreate = async () => {
    setCreating(true);

    try {
      const workflowData = {
        name: state.name,
        description: state.description,
        organizationId: state.organizationId,
        trigger: {
          event: state.trigger?.event,
          ...state.conditions,
        },
        actions: state.actions,
        isActive: state.isActive,
      };

      await createWorkflow(workflowData);

      clearDraft();

      showToast('Workflow created successfully!', 'success');

      if (onClose) {
        onClose();
      } else {
        router.push('/counsel/workflows');
      }
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to create workflow',
        'error'
      );
    } finally {
      setCreating(false);
    }
  };

  const renderStep = () => {
    switch (state.currentStep) {
      case 1:
        return (
          <Step1BasicInfo
            name={state.name}
            description={state.description}
            isActive={state.isActive}
            onNameChange={(name) => setState({ ...state, name })}
            onDescriptionChange={(description) => setState({ ...state, description })}
            onActiveChange={(isActive) => setState({ ...state, isActive })}
            errors={errors}
          />
        );

      case 2:
        return (
          <Step2SelectTrigger
            trigger={state.trigger}
            onTriggerChange={handleTriggerChange}
            error={errors.trigger}
          />
        );

      case 3:
        return (
          <Step3ConfigureConditions
            trigger={state.trigger}
            conditions={state.conditions}
            onConditionsChange={(conditions) => setState({ ...state, conditions })}
            error={errors.conditions}
          />
        );

      case 4:
        return (
          <Step4AddActions
            actions={state.actions}
            onActionsChange={(actions) => setState({ ...state, actions })}
            error={errors.actions}
          />
        );

      case 5:
        return (
          <Step5ReviewActivate
            state={state}
            onTest={handleTest}
            testing={testing}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[1, 2, 3, 4, 5].map((step) => (
            <div key={step} className="flex items-center flex-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  step === state.currentStep
                    ? 'bg-blue-600 text-white'
                    : step < state.currentStep
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {step < state.currentStep ? '✓' : step}
              </div>
              {step < 5 && (
                <div
                  className={`flex-1 h-1 mx-2 ${
                    step < state.currentStep ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-600">
          <span>Basic Info</span>
          <span>Trigger</span>
          <span>Conditions</span>
          <span>Actions</span>
          <span>Review</span>
        </div>
      </div>

      {/* Current Step Content */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        {renderStep()}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <button
          onClick={handlePrevious}
          disabled={state.currentStep === 1}
          className="px-6 py-2 border rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>

        <div className="flex gap-3">
          {onClose && (
            <button
              onClick={onClose}
              className="px-6 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          )}

          {state.currentStep < 5 ? (
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={creating}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
            >
              {creating ? 'Creating...' : 'Create Workflow'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
