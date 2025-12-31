import { Test, TestingModule } from '@nestjs/testing';
import { WorkflowRuleService } from './workflow-rule.service';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowRuleLevel } from '@prisma/client';

describe('WorkflowRuleService', () => {
  let service: WorkflowRuleService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowRuleService,
        {
          provide: PrismaService,
          useValue: {
            workflowRule: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<WorkflowRuleService>(WorkflowRuleService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createRule', () => {
    it('should create a platform-level rule', async () => {
      const createDto = {
        name: 'Crisis Alert Rule',
        level: WorkflowRuleLevel.platform,
        trigger: { type: 'wellbeing_change' },
        conditions: { scoreChange: -2 },
        actions: [{ type: 'send_crisis_alert' }],
        priority: 100,
      };

      const mockRule = {
        id: 'rule-1',
        ...createDto,
        ownerId: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.workflowRule.create as jest.Mock).mockResolvedValue(mockRule);

      const result = await service.createRule(createDto);

      expect(prisma.workflowRule.create).toHaveBeenCalledWith({
        data: {
          name: createDto.name,
          level: createDto.level,
          ownerId: undefined,
          trigger: createDto.trigger,
          conditions: createDto.conditions,
          actions: createDto.actions,
          priority: createDto.priority,
          isActive: true,
        },
      });
      expect(result).toEqual(mockRule);
    });

    it('should create a counselor-level rule with ownerId', async () => {
      const createDto = {
        name: 'Custom Task Rule',
        level: WorkflowRuleLevel.counselor,
        ownerId: 'counselor-1',
        trigger: { type: 'session_created' },
        actions: [{ type: 'create_task', taskTemplateId: 'template-1' }],
        priority: 50,
      };

      const mockRule = {
        id: 'rule-2',
        ...createDto,
        conditions: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.workflowRule.create as jest.Mock).mockResolvedValue(mockRule);

      const result = await service.createRule(createDto);

      expect(prisma.workflowRule.create).toHaveBeenCalledWith({
        data: {
          name: createDto.name,
          level: createDto.level,
          ownerId: createDto.ownerId,
          trigger: createDto.trigger,
          conditions: undefined,
          actions: createDto.actions,
          priority: createDto.priority,
          isActive: true,
        },
      });
      expect(result).toEqual(mockRule);
    });
  });

  describe('getRules', () => {
    it('should get all active rules ordered by priority', async () => {
      const mockRules = [
        {
          id: 'rule-1',
          name: 'High Priority Rule',
          level: WorkflowRuleLevel.platform,
          ownerId: null,
          trigger: {},
          conditions: null,
          actions: [],
          priority: 100,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'rule-2',
          name: 'Medium Priority Rule',
          level: WorkflowRuleLevel.organization,
          ownerId: 'org-1',
          trigger: {},
          conditions: null,
          actions: [],
          priority: 50,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (prisma.workflowRule.findMany as jest.Mock).mockResolvedValue(mockRules);

      const result = await service.getRules();

      expect(prisma.workflowRule.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { priority: 'desc' },
      });
      expect(result).toEqual(mockRules);
    });

    it('should filter rules by level', async () => {
      const mockRules = [
        {
          id: 'rule-1',
          name: 'Platform Rule',
          level: WorkflowRuleLevel.platform,
          ownerId: null,
          trigger: {},
          conditions: null,
          actions: [],
          priority: 100,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (prisma.workflowRule.findMany as jest.Mock).mockResolvedValue(mockRules);

      const result = await service.getRules({ level: WorkflowRuleLevel.platform });

      expect(prisma.workflowRule.findMany).toHaveBeenCalledWith({
        where: { level: WorkflowRuleLevel.platform },
        orderBy: { priority: 'desc' },
      });
      expect(result).toEqual(mockRules);
    });

    it('should filter rules by ownerId', async () => {
      const mockRules = [
        {
          id: 'rule-1',
          name: 'Counselor Rule',
          level: WorkflowRuleLevel.counselor,
          ownerId: 'counselor-1',
          trigger: {},
          conditions: null,
          actions: [],
          priority: 50,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (prisma.workflowRule.findMany as jest.Mock).mockResolvedValue(mockRules);

      const result = await service.getRules({ ownerId: 'counselor-1' });

      expect(prisma.workflowRule.findMany).toHaveBeenCalledWith({
        where: { ownerId: 'counselor-1' },
        orderBy: { priority: 'desc' },
      });
      expect(result).toEqual(mockRules);
    });

    it('should filter rules by isActive', async () => {
      const mockRules = [
        {
          id: 'rule-1',
          name: 'Active Rule',
          level: WorkflowRuleLevel.platform,
          ownerId: null,
          trigger: {},
          conditions: null,
          actions: [],
          priority: 100,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (prisma.workflowRule.findMany as jest.Mock).mockResolvedValue(mockRules);

      const result = await service.getRules({ isActive: true });

      expect(prisma.workflowRule.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { priority: 'desc' },
      });
      expect(result).toEqual(mockRules);
    });

    it('should combine multiple filters', async () => {
      const mockRules = [
        {
          id: 'rule-1',
          name: 'Filtered Rule',
          level: WorkflowRuleLevel.counselor,
          ownerId: 'counselor-1',
          trigger: {},
          conditions: null,
          actions: [],
          priority: 75,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (prisma.workflowRule.findMany as jest.Mock).mockResolvedValue(mockRules);

      const result = await service.getRules({
        level: WorkflowRuleLevel.counselor,
        ownerId: 'counselor-1',
        isActive: true,
      });

      expect(prisma.workflowRule.findMany).toHaveBeenCalledWith({
        where: {
          level: WorkflowRuleLevel.counselor,
          ownerId: 'counselor-1',
          isActive: true,
        },
        orderBy: { priority: 'desc' },
      });
      expect(result).toEqual(mockRules);
    });
  });

  describe('getRule', () => {
    it('should get a specific rule by ID', async () => {
      const mockRule = {
        id: 'rule-1',
        name: 'Specific Rule',
        level: WorkflowRuleLevel.platform,
        ownerId: null,
        trigger: { type: 'wellbeing_change' },
        conditions: { scoreChange: -2 },
        actions: [{ type: 'send_crisis_alert' }],
        priority: 100,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.workflowRule.findUnique as jest.Mock).mockResolvedValue(mockRule);

      const result = await service.getRule('rule-1');

      expect(prisma.workflowRule.findUnique).toHaveBeenCalledWith({
        where: { id: 'rule-1' },
      });
      expect(result).toEqual(mockRule);
    });

    it('should return null if rule not found', async () => {
      (prisma.workflowRule.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.getRule('nonexistent');

      expect(prisma.workflowRule.findUnique).toHaveBeenCalledWith({
        where: { id: 'nonexistent' },
      });
      expect(result).toBeNull();
    });
  });

  describe('updateRule', () => {
    it('should update rule properties', async () => {
      const updates = {
        name: 'Updated Rule Name',
        priority: 150,
        isActive: false,
      };

      const mockUpdatedRule = {
        id: 'rule-1',
        name: 'Updated Rule Name',
        level: WorkflowRuleLevel.platform,
        ownerId: null,
        trigger: { type: 'wellbeing_change' },
        conditions: { scoreChange: -2 },
        actions: [{ type: 'send_crisis_alert' }],
        priority: 150,
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.workflowRule.update as jest.Mock).mockResolvedValue(mockUpdatedRule);

      const result = await service.updateRule('rule-1', updates);

      expect(prisma.workflowRule.update).toHaveBeenCalledWith({
        where: { id: 'rule-1' },
        data: updates,
      });
      expect(result).toEqual(mockUpdatedRule);
    });

    it('should update trigger and actions', async () => {
      const updates = {
        trigger: { type: 'assessment_submitted' },
        actions: [{ type: 'create_task', taskTemplateId: 'template-2' }],
      };

      const mockUpdatedRule = {
        id: 'rule-1',
        name: 'Rule',
        level: WorkflowRuleLevel.platform,
        ownerId: null,
        trigger: { type: 'assessment_submitted' },
        conditions: null,
        actions: [{ type: 'create_task', taskTemplateId: 'template-2' }],
        priority: 100,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.workflowRule.update as jest.Mock).mockResolvedValue(mockUpdatedRule);

      const result = await service.updateRule('rule-1', updates);

      expect(prisma.workflowRule.update).toHaveBeenCalledWith({
        where: { id: 'rule-1' },
        data: updates,
      });
      expect(result).toEqual(mockUpdatedRule);
    });
  });

  describe('deleteRule', () => {
    it('should delete a rule', async () => {
      const mockDeletedRule = {
        id: 'rule-1',
        name: 'Deleted Rule',
        level: WorkflowRuleLevel.platform,
        ownerId: null,
        trigger: {},
        conditions: null,
        actions: [],
        priority: 100,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.workflowRule.delete as jest.Mock).mockResolvedValue(mockDeletedRule);

      const result = await service.deleteRule('rule-1');

      expect(prisma.workflowRule.delete).toHaveBeenCalledWith({
        where: { id: 'rule-1' },
      });
      expect(result).toEqual(mockDeletedRule);
    });
  });
});
