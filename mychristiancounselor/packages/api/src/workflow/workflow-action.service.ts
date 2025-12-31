import { Injectable, Logger } from '@nestjs/common';
import { CrisisAlertService } from '../counsel/crisis-alert.service';
import { AssessmentService } from '../counsel/assessment.service';
import { MemberTaskService } from '../counsel/member-task.service';
import { EmailService } from '../email/email.service';

export interface WorkflowAction {
  id: string;
  type:
    | 'send_crisis_alert_email'
    | 'auto_assign_assessment'
    | 'auto_assign_task'
    | 'notify_counselor';
  config: any;
}

export interface EventData {
  memberId?: string;
  assessmentSubmissionId?: string;
  counselorId?: string;
  [key: string]: any;
}

export interface ActionResult {
  success: boolean;
  result: any;
}

@Injectable()
export class WorkflowActionService {
  private readonly logger = new Logger(WorkflowActionService.name);

  constructor(
    private readonly crisisAlertService: CrisisAlertService,
    private readonly assessmentService: AssessmentService,
    private readonly memberTaskService: MemberTaskService,
    private readonly emailService: EmailService,
  ) {}

  async executeAction(
    action: WorkflowAction,
    eventData: EventData,
  ): Promise<ActionResult> {
    this.logger.log(
      `Executing action ${action.id} of type ${action.type}`,
    );

    switch (action.type) {
      case 'send_crisis_alert_email':
        return this.executeSendCrisisAlert(eventData);
      case 'auto_assign_assessment':
        return this.executeAutoAssignAssessment(action, eventData);
      case 'auto_assign_task':
        return this.executeAutoAssignTask(action, eventData);
      case 'notify_counselor':
        return this.executeNotifyCounselor(action, eventData);
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  private async executeSendCrisisAlert(
    eventData: EventData,
  ): Promise<ActionResult> {
    const result = await this.crisisAlertService.sendCrisisAlert(
      eventData.memberId,
      eventData.assessmentSubmissionId,
    );

    return {
      success: true,
      result,
    };
  }

  private async executeAutoAssignAssessment(
    action: WorkflowAction,
    eventData: EventData,
  ): Promise<ActionResult> {
    const assessmentType = action.config.assessmentType;
    const assessment = this.getAssessmentByType(assessmentType);

    const dueDate = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days from now

    const result = await this.assessmentService.assignAssessment({
      assessmentId: assessment.id,
      memberId: eventData.memberId,
      dueDate,
    });

    return {
      success: true,
      result,
    };
  }

  private async executeAutoAssignTask(
    action: WorkflowAction,
    eventData: EventData,
  ): Promise<ActionResult> {
    const dueDate = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days from now
    const assignedTo = eventData.counselorId || 'system';

    const result = await this.memberTaskService.createTask({
      memberId: eventData.memberId,
      assignedTo,
      title: action.config.taskTitle,
      description: action.config.taskDescription,
      dueDate,
    });

    return {
      success: true,
      result,
    };
  }

  private async executeNotifyCounselor(
    action: WorkflowAction,
    eventData: EventData,
  ): Promise<ActionResult> {
    const counselorId = eventData.counselorId || 'system';
    const counselorEmail = this.getCounselorEmail(counselorId);

    const result = await this.emailService.sendEmail({
      to: counselorEmail,
      subject: action.config.subject,
      template: action.config.emailTemplate,
      context: eventData,
    });

    return {
      success: true,
      result,
    };
  }

  /**
   * Helper method to get assessment by type
   * This is a simplified version for the initial implementation
   */
  private getAssessmentByType(type: string): { id: string } {
    return {
      id: `assessment-${type.toLowerCase()}`,
    };
  }

  /**
   * Helper method to get counselor email
   * This is a simplified version for the initial implementation
   */
  private getCounselorEmail(counselorId: string): string {
    return 'counselor@example.com';
  }
}
