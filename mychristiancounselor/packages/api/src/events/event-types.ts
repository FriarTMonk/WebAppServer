/**
 * Event type definitions for counselor alert system
 * Ensures type safety across event publishers and subscribers
 */

// Crisis detection event
export interface CrisisDetectedEvent {
  memberId: string;
  crisisType: 'suicidal_ideation' | 'self_harm' | 'severe_depression';
  confidence: 'high' | 'medium' | 'low';
  detectionMethod: 'pattern' | 'ai' | 'both';
  triggeringMessage: string;
  messageId?: string;
  timestamp: Date;
}

// Wellbeing status changed event
export interface WellbeingStatusChangedEvent {
  memberId: string;
  previousStatus: 'green' | 'yellow' | 'red';
  newStatus: 'green' | 'yellow' | 'red';
  trajectory?: 'improving' | 'stable' | 'declining';
  timestamp: Date;
}

// Assessment completed event
export interface AssessmentCompletedEvent {
  memberId: string;
  assessmentId: string;
  assessmentType: string;
  score?: number;
  previousScore?: number;
  timestamp: Date;
}

// Task completed event
export interface TaskCompletedEvent {
  memberId: string;
  taskId: string;
  taskType: string;
  counselorId: string;
  timestamp: Date;
}

// Event type constants
export const EVENT_TYPES = {
  CRISIS_DETECTED: 'crisis.detected',
  WELLBEING_STATUS_CHANGED: 'wellbeing.status.changed',
  WELLBEING_TRAJECTORY_CHANGED: 'wellbeing.trajectory.changed',
  ASSESSMENT_COMPLETED: 'assessment.completed',
  ASSESSMENT_SCORE_CHANGED: 'assessment.score.changed',
  TASK_COMPLETED: 'task.completed',
  TASK_OVERDUE: 'task.overdue',
} as const;
