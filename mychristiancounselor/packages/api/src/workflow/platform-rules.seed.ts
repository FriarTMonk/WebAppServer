import { WorkflowRuleLevel } from '@prisma/client';

export const PLATFORM_DEFAULT_RULES = [
  {
    name: 'Crisis Detection → Alert + PHQ-9',
    level: 'platform' as WorkflowRuleLevel,
    trigger: { event: 'crisis.detected' },
    conditions: { confidence: 'high' },
    actions: [
      { type: 'send_crisis_alert_email' },
      {
        type: 'auto_assign_assessment',
        assessmentType: 'PHQ-9',
      },
    ],
    priority: 100,
  },
  {
    name: 'Wellbeing Declined → Notify Counselor + Task',
    level: 'platform' as WorkflowRuleLevel,
    trigger: { event: 'wellbeing.status.changed' },
    conditions: {
      newStatus: 'red',
    },
    actions: [
      {
        type: 'notify_counselor',
        subject: 'Member wellbeing declined',
        message: 'A member you are counseling has declined to red status.',
      },
      {
        type: 'auto_assign_task',
        taskType: 'conversation_prompt',
        title: 'Check-in conversation',
        description: 'Have a check-in conversation to discuss recent struggles.',
      },
    ],
    priority: 90,
  },
  {
    name: 'PHQ-9 Score Improving → Encouragement',
    level: 'platform' as WorkflowRuleLevel,
    trigger: { event: 'assessment.completed' },
    conditions: {
      assessmentType: 'PHQ-9',
      // Custom condition: score decreased by 5+
    },
    actions: [
      {
        type: 'notify_counselor',
        subject: 'Member showing improvement',
        message: 'A member\'s PHQ-9 score has improved significantly.',
      },
    ],
    priority: 50,
  },
  {
    name: 'Task Overdue → Reminder',
    level: 'platform' as WorkflowRuleLevel,
    trigger: { event: 'task.overdue' },
    conditions: null,
    actions: [
      {
        type: 'notify_counselor',
        subject: 'Task overdue',
        message: 'A task you assigned is now overdue.',
      },
    ],
    priority: 30,
  },
];
