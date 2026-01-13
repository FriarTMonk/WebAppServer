export interface TriggerConfig {
  event: string;
  name: string;
  description: string;
}

export interface ConditionConfig {
  [key: string]: any;
}

export interface ActionConfig {
  type: string;
  [key: string]: any;
}

export interface WorkflowWizardState {
  currentStep: 1 | 2 | 3 | 4 | 5;
  name: string;
  description: string;
  organizationId: string;
  isActive: boolean;
  trigger: TriggerConfig | null;
  conditions: ConditionConfig;
  actions: ActionConfig[];
}

export interface TriggerType {
  event: string;
  name: string;
  description: string;
  helpText: string;
  exampleJson: any;
}

export interface ActionType {
  type: string;
  name: string;
  description: string;
  fields: ActionField[];
}

export interface ActionField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'number';
  required: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  min?: number;
  max?: number;
}
