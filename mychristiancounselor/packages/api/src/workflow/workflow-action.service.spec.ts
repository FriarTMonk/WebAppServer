import { Test, TestingModule } from '@nestjs/testing';
import { WorkflowActionService } from './workflow-action.service';
import { CrisisAlertService } from '../counsel/crisis-alert.service';
import { AssessmentService } from '../counsel/assessment.service';
import { MemberTaskService } from '../counsel/member-task.service';
import { EmailService } from '../email/email.service';
import { Logger } from '@nestjs/common';

describe('WorkflowActionService', () => {
  let service: WorkflowActionService;
  let crisisAlertService: jest.Mocked<CrisisAlertService>;
  let assessmentService: jest.Mocked<AssessmentService>;
  let memberTaskService: jest.Mocked<MemberTaskService>;
  let emailService: jest.Mocked<EmailService>;

  beforeEach(async () => {
    const mockCrisisAlertService = {
      sendCrisisAlert: jest.fn(),
    };

    const mockAssessmentService = {
      assignAssessment: jest.fn(),
    };

    const mockMemberTaskService = {
      createTask: jest.fn(),
    };

    const mockEmailService = {
      sendEmail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowActionService,
        {
          provide: CrisisAlertService,
          useValue: mockCrisisAlertService,
        },
        {
          provide: AssessmentService,
          useValue: mockAssessmentService,
        },
        {
          provide: MemberTaskService,
          useValue: mockMemberTaskService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    service = module.get<WorkflowActionService>(WorkflowActionService);
    crisisAlertService = module.get(CrisisAlertService);
    assessmentService = module.get(AssessmentService);
    memberTaskService = module.get(MemberTaskService);
    emailService = module.get(EmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('executeAction', () => {
    it('should execute send_crisis_alert_email action', async () => {
      const action = {
        id: 'action1',
        type: 'send_crisis_alert_email' as const,
        config: {},
      };
      const eventData = {
        memberId: 'member123',
        assessmentSubmissionId: 'submission123',
      };

      crisisAlertService.sendCrisisAlert.mockResolvedValue({
        success: true,
        alertSent: true,
      });

      const result = await service.executeAction(action, eventData);

      expect(result).toEqual({
        success: true,
        result: { success: true, alertSent: true },
      });
      expect(crisisAlertService.sendCrisisAlert).toHaveBeenCalledWith(
        eventData,
      );
    });

    it('should execute auto_assign_assessment action', async () => {
      const action = {
        id: 'action2',
        type: 'auto_assign_assessment' as const,
        assessmentType: 'PHQ-9',
      };
      const eventData = {
        memberId: 'member123',
      };

      const mockAssignment = {
        id: 'assignment123',
        assessmentId: 'assessment-phq-9',
        memberId: 'member123',
      };

      assessmentService.assignAssessment.mockResolvedValue(mockAssignment);

      const result = await service.executeAction(action, eventData);

      expect(result).toEqual({
        success: true,
        result: mockAssignment,
      });
      expect(assessmentService.assignAssessment).toHaveBeenCalledWith({
        assessmentId: 'assessment-phq-9',
        memberId: eventData.memberId,
        dueDate: expect.any(Number),
      });

      // Verify due date is approximately 7 days from now
      const call = assessmentService.assignAssessment.mock.calls[0][0];
      const expectedDueDate = Date.now() + 7 * 24 * 60 * 60 * 1000;
      expect(call.dueDate).toBeGreaterThan(expectedDueDate - 1000);
      expect(call.dueDate).toBeLessThan(expectedDueDate + 1000);
    });

    it('should execute auto_assign_task action', async () => {
      const action = {
        id: 'action3',
        type: 'auto_assign_task' as const,
        taskType: 'conversation_prompt',
        title: 'Discuss forgiveness',
        description: 'Talk about forgiving others',
      };
      const eventData = {
        memberId: 'member123',
        counselorId: 'counselor456',
      };

      const mockTask = {
        id: 'task123',
        title: 'Discuss forgiveness',
        description: 'Talk about forgiving others',
      };

      memberTaskService.createTask.mockResolvedValue(mockTask);

      const result = await service.executeAction(action, eventData);

      expect(result).toEqual({
        success: true,
        result: mockTask,
      });
      expect(memberTaskService.createTask).toHaveBeenCalledWith({
        memberId: eventData.memberId,
        counselorId: eventData.counselorId,
        type: action.taskType,
        title: action.title,
        description: action.description,
        dueDate: expect.any(Date),
      });
    });

    it('should execute notify_counselor action', async () => {
      const action = {
        id: 'action4',
        type: 'notify_counselor' as const,
        subject: 'Member wellbeing declined',
        message: 'Member status changed to red',
      };
      const eventData = {
        memberId: 'member123',
        counselorId: 'counselor456',
      };

      emailService.sendEmail.mockResolvedValue({ success: true });

      const result = await service.executeAction(action, eventData);

      expect(result).toEqual({
        success: true,
        result: { success: true },
      });
      expect(emailService.sendEmail).toHaveBeenCalledWith({
        to: expect.any(String),
        subject: action.subject,
        text: action.message,
        html: `<p>${action.message}</p>`,
      });
    });

    it('should throw error for unknown action type', async () => {
      const action = {
        id: 'action5',
        type: 'unknown_action' as any,
        config: {},
      };
      const eventData = {};

      await expect(service.executeAction(action, eventData)).rejects.toThrow(
        'Unknown action type: unknown_action',
      );
    });
  });
});
