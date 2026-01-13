import { TriggerType, ActionType } from './types';

export const TRIGGER_TYPES: TriggerType[] = [
  {
    event: 'assessment_completed',
    name: 'Assessment Completed',
    description: 'Triggers when a member completes any assessment',
    helpText: 'Use this to automatically respond when members complete assessments like PHQ-9 or GAD-7.',
    exampleJson: { event: 'assessment_completed' },
  },
  {
    event: 'score_threshold_exceeded',
    name: 'Score Threshold Exceeded',
    description: 'Triggers when assessment score exceeds a threshold',
    helpText: 'Alert counselors when assessment scores indicate high risk or severe symptoms.',
    exampleJson: { event: 'assessment_completed', scoreThreshold: true },
  },
  {
    event: 'task_overdue',
    name: 'Task Overdue',
    description: 'Triggers when a task passes its due date',
    helpText: 'Follow up with members who haven\'t completed assigned tasks.',
    exampleJson: { event: 'task_overdue' },
  },
  {
    event: 'conversation_stale',
    name: 'Conversation Stale',
    description: 'Triggers when no counselor response in X days',
    helpText: 'Ensure timely responses by alerting when conversations go unanswered.',
    exampleJson: { event: 'conversation_stale' },
  },
  {
    event: 'wellness_pattern',
    name: 'Wellness Pattern Detected',
    description: 'Triggers when AI detects wellness trend',
    helpText: 'Proactively respond to declining wellness trends detected by AI analysis.',
    exampleJson: { event: 'wellness_pattern' },
  },
  {
    event: 'crisis_keyword',
    name: 'Crisis Keyword',
    description: 'Triggers when specific words detected in conversation',
    helpText: 'Immediately alert counselors when crisis-related keywords are detected.',
    exampleJson: { event: 'crisis_keyword' },
  },
  {
    event: 'member_inactive',
    name: 'Member Inactive',
    description: 'Triggers when member hasn\'t logged in for X days',
    helpText: 'Re-engage members who have stopped using the platform.',
    exampleJson: { event: 'member_inactive' },
  },
  {
    event: 'subscription_expiring',
    name: 'Subscription Expiring',
    description: 'Triggers X days before subscription renewal',
    helpText: 'Remind members about upcoming subscription renewals.',
    exampleJson: { event: 'subscription_expiring' },
  },
];

export const ACTION_TYPES: ActionType[] = [
  {
    type: 'send_email',
    name: 'Send Email',
    description: 'Send an email to member, counselor, or admin',
    fields: [
      {
        name: 'to',
        label: 'Recipient',
        type: 'select',
        required: true,
        options: [
          { value: 'member', label: 'Member' },
          { value: 'counselor', label: 'Assigned Counselor' },
          { value: 'admin', label: 'Organization Admin' },
        ],
      },
      {
        name: 'template',
        label: 'Email Template',
        type: 'select',
        required: true,
        options: [
          { value: 'high_depression_alert', label: 'High Depression Alert' },
          { value: 'task_reminder', label: 'Task Reminder' },
          { value: 'check_in', label: 'Check-In Request' },
        ],
      },
      {
        name: 'customSubject',
        label: 'Custom Subject (Optional)',
        type: 'text',
        required: false,
        placeholder: 'Override default subject line',
      },
    ],
  },
  {
    type: 'assign_task',
    name: 'Create Task',
    description: 'Assign a task to the member',
    fields: [
      {
        name: 'taskType',
        label: 'Task Type',
        type: 'select',
        required: true,
        options: [
          { value: 'assessment', label: 'Assessment' },
          { value: 'homework', label: 'Homework' },
          { value: 'reading', label: 'Reading' },
          { value: 'custom', label: 'Custom' },
        ],
      },
      {
        name: 'dueDate',
        label: 'Due Date (days from now)',
        type: 'number',
        required: true,
        min: 1,
        max: 90,
        placeholder: '7',
      },
      {
        name: 'priority',
        label: 'Priority',
        type: 'select',
        required: true,
        options: [
          { value: 'low', label: 'Low' },
          { value: 'medium', label: 'Medium' },
          { value: 'high', label: 'High' },
        ],
      },
      {
        name: 'note',
        label: 'Note to Member (Optional)',
        type: 'textarea',
        required: false,
        placeholder: 'Additional context or instructions',
      },
    ],
  },
  {
    type: 'update_status',
    name: 'Update Status',
    description: 'Update member priority or flag',
    fields: [
      {
        name: 'field',
        label: 'Status Field',
        type: 'select',
        required: true,
        options: [
          { value: 'priority', label: 'Member Priority' },
          { value: 'flag', label: 'Flag Status' },
        ],
      },
      {
        name: 'value',
        label: 'New Value',
        type: 'select',
        required: true,
        options: [
          { value: 'high', label: 'High' },
          { value: 'medium', label: 'Medium' },
          { value: 'low', label: 'Low' },
        ],
      },
    ],
  },
  {
    type: 'create_crisis_alert',
    name: 'Trigger Alert',
    description: 'Create a crisis or high-priority alert',
    fields: [
      {
        name: 'severity',
        label: 'Severity',
        type: 'select',
        required: true,
        options: [
          { value: 'low', label: 'Low' },
          { value: 'medium', label: 'Medium' },
          { value: 'high', label: 'High' },
          { value: 'critical', label: 'Critical' },
        ],
      },
      {
        name: 'reason',
        label: 'Reason',
        type: 'textarea',
        required: true,
        placeholder: 'e.g., PHQ-9 score indicates severe depression',
      },
    ],
  },
  {
    type: 'assign_counselor',
    name: 'Assign Counselor',
    description: 'Assign or reassign counselor to member',
    fields: [
      {
        name: 'counselorId',
        label: 'Counselor',
        type: 'select',
        required: true,
        options: [], // Will be populated dynamically
      },
      {
        name: 'reason',
        label: 'Reassignment Reason (Optional)',
        type: 'textarea',
        required: false,
        placeholder: 'e.g., Escalation to senior counselor',
      },
    ],
  },
  {
    type: 'log_event',
    name: 'Log Event',
    description: 'Log a custom event for tracking',
    fields: [
      {
        name: 'eventType',
        label: 'Event Type',
        type: 'text',
        required: true,
        placeholder: 'e.g., workflow_triggered',
      },
      {
        name: 'details',
        label: 'Details (JSON)',
        type: 'textarea',
        required: false,
        placeholder: '{"key": "value"}',
      },
    ],
  },
];
