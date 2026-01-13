export async function testWorkflow(workflowData: any): Promise<{ success: boolean; message: string }> {
  try {
    // Validate workflow structure
    if (!workflowData.name || workflowData.name.trim().length < 3) {
      return { success: false, message: 'Workflow name must be at least 3 characters' };
    }

    if (!workflowData.trigger || !workflowData.trigger.event) {
      return { success: false, message: 'Trigger is required' };
    }

    if (!workflowData.actions || workflowData.actions.length === 0) {
      return { success: false, message: 'At least one action is required' };
    }

    // Validate actions
    for (const action of workflowData.actions) {
      if (!action.type) {
        return { success: false, message: 'All actions must have a type' };
      }
    }

    return {
      success: true,
      message: `Workflow validated successfully! ${workflowData.actions.length} actions configured.`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Validation failed',
    };
  }
}

export async function createWorkflow(workflowData: any): Promise<any> {
  const response = await fetch('/api/counsel/workflows', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
    body: JSON.stringify(workflowData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create workflow');
  }

  return response.json();
}
