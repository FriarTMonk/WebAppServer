import { WorkflowWizardState } from './types';

const STORAGE_KEY = 'workflow-wizard-draft';

export function saveDraft(state: WorkflowWizardState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save workflow draft:', error);
  }
}

export function loadDraft(): WorkflowWizardState | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    return JSON.parse(saved);
  } catch (error) {
    console.error('Failed to load workflow draft:', error);
    return null;
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear workflow draft:', error);
  }
}
