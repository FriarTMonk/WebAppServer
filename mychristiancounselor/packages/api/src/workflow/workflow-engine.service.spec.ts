import { Test, TestingModule } from '@nestjs/testing';
import { WorkflowEngineService } from './workflow-engine.service';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowActionService } from './workflow-action.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('WorkflowEngineService', () => {
  let service: WorkflowEngineService;
  let prisma: PrismaService;
  let actionService: WorkflowActionService;

  const mockPrismaService = {
    workflowRule: {
      findMany: jest.fn(),
    },
    workflowExecution: {
      create: jest.fn(),
    },
  };

  const mockActionService = {
    executeAction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowEngineService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: WorkflowActionService, useValue: mockActionService },
        { provide: EventEmitter2, useValue: { on: jest.fn() } },
      ],
    }).compile();

    service = module.get<WorkflowEngineService>(WorkflowEngineService);
    prisma = module.get<PrismaService>(PrismaService);
    actionService = module.get<WorkflowActionService>(WorkflowActionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('evaluateEvent', () => {
    it('should evaluate matching rules and execute actions', async () => {
      const event = {
        memberId: 'member-123',
        crisisType: 'suicidal_ideation',
        confidence: 'high',
        timestamp: new Date(),
      };

      const matchingRule = {
        id: 'rule-1',
        name: 'Crisis Alert Rule',
        level: 'platform',
        ownerId: null,
        trigger: { event: 'crisis.detected' },
        conditions: { confidence: 'high' },
        actions: [
          { type: 'send_crisis_alert_email' },
          { type: 'auto_assign_assessment', assessmentType: 'PHQ-9' },
        ],
        priority: 10,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.workflowRule.findMany.mockResolvedValue([
        matchingRule,
      ]);
      mockActionService.executeAction.mockResolvedValue({ success: true });
      mockPrismaService.workflowExecution.create.mockResolvedValue({});

      await service.evaluateEvent('crisis.detected', event);

      expect(prisma.workflowRule.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { priority: 'desc' },
      });
      expect(actionService.executeAction).toHaveBeenCalledTimes(2);
      expect(prisma.workflowExecution.create).toHaveBeenCalled();
    });

    it('should skip rules that do not match trigger', async () => {
      const event = {
        memberId: 'member-123',
        assessmentId: 'phq9',
        timestamp: new Date(),
      };

      const nonMatchingRule = {
        id: 'rule-1',
        name: 'Crisis Rule',
        level: 'platform',
        ownerId: null,
        trigger: { event: 'crisis.detected' },
        conditions: null,
        actions: [{ type: 'send_email' }],
        priority: 10,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.workflowRule.findMany.mockResolvedValue([
        nonMatchingRule,
      ]);

      await service.evaluateEvent('assessment.completed', event);

      expect(actionService.executeAction).not.toHaveBeenCalled();
    });

    it('should evaluate conditions when present', async () => {
      const event = {
        memberId: 'member-123',
        previousStatus: 'yellow',
        newStatus: 'red',
        timestamp: new Date(),
      };

      const ruleWithConditions = {
        id: 'rule-1',
        name: 'Wellbeing Decline Rule',
        level: 'platform',
        ownerId: null,
        trigger: { event: 'wellbeing.status.changed' },
        conditions: { newStatus: 'red', previousStatus: 'yellow' },
        actions: [{ type: 'notify_counselor' }],
        priority: 10,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.workflowRule.findMany.mockResolvedValue([
        ruleWithConditions,
      ]);
      mockActionService.executeAction.mockResolvedValue({ success: true });
      mockPrismaService.workflowExecution.create.mockResolvedValue({});

      await service.evaluateEvent('wellbeing.status.changed', event);

      expect(actionService.executeAction).toHaveBeenCalled();
    });
  });
});
