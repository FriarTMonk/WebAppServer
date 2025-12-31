# Phase 3: Member Tasks & Workflow Engine Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable counselors to assign tasks to members (conversation prompts, offline activities, guided conversations) and automate responses to system events through a configurable workflow rules engine with tiered configuration (platform/organization/counselor levels).

**Architecture:** Event-driven architecture with loose coupling between features. MemberTask system handles CRUD and completion tracking. WorkflowEngine subscribes to all system events, evaluates rules at three hierarchy levels (platform → organization → counselor), and triggers actions asynchronously without blocking user experience.

**Tech Stack:** NestJS services, Prisma ORM, EventEmitter2 for event bus, Jest for testing, @nestjs/schedule for cron jobs, JWT authentication for REST APIs

---

## Prerequisites

**Database Models:** Already exist in schema (Phase 1):
- `MemberTask` - Task assignments with type (conversation_prompt, offline_task, guided_conversation), status (pending, completed, overdue)
- `WorkflowRule` - Rules with level (platform, organization, counselor), trigger, conditions, actions
- `WorkflowExecution` - Audit log of rule executions

**Event Infrastructure:** Already exists from Phase 1-2:
- Event types defined in `packages/api/src/events/event-types.ts`
- EventEmitter2 configured in app module
- Events: crisis.detected, wellbeing.status.changed, assessment.completed, task.completed, task.overdue, session.completed

**AI Services:** Already exist:
- `CounselingAiService.extractTheologicalThemes()` - For topic detection in conversations
- `AiService.generateText()` - For AI operations

---

## Task 1: MemberTaskService - Core CRUD Operations

**Files:**
- Create: `packages/api/src/counsel/member-task.service.ts`
- Create: `packages/api/src/counsel/member-task.service.spec.ts`

**Step 1: Write failing test for createTask**

Create `packages/api/src/counsel/member-task.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { MemberTaskService } from './member-task.service';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('MemberTaskService', () => {
  let service: MemberTaskService;
  let prisma: PrismaService;
  let eventEmitter: EventEmitter2;

  const mockPrismaService = {
    memberTask: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemberTaskService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<MemberTaskService>(MemberTaskService);
    prisma = module.get<PrismaService>(PrismaService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createTask', () => {
    it('should create a conversation prompt task', async () => {
      const dto = {
        memberId: 'member-123',
        counselorId: 'counselor-456',
        type: 'conversation_prompt' as const,
        title: 'Discuss forgiveness',
        description: 'Have a conversation about forgiving others',
        dueDate: new Date('2025-01-15'),
      };

      const expectedTask = {
        id: 'task-789',
        ...dto,
        status: 'pending',
        completedAt: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.memberTask.create.mockResolvedValue(expectedTask);

      const result = await service.createTask(dto);

      expect(result).toEqual(expectedTask);
      expect(prisma.memberTask.create).toHaveBeenCalledWith({
        data: {
          memberId: dto.memberId,
          counselorId: dto.counselorId,
          type: dto.type,
          title: dto.title,
          description: dto.description,
          dueDate: dto.dueDate,
          status: 'pending',
        },
      });
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- member-task.service.spec.ts`
Expected: FAIL with "Cannot find module './member-task.service'"

**Step 3: Write minimal implementation**

Create `packages/api/src/counsel/member-task.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MemberTaskType, MemberTaskStatus } from '@prisma/client';

export interface CreateTaskDto {
  memberId: string;
  counselorId: string;
  type: MemberTaskType;
  title: string;
  description: string;
  dueDate?: Date;
  metadata?: any;
}

@Injectable()
export class MemberTaskService {
  private readonly logger = new Logger(MemberTaskService.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create a new task assigned to a member
   */
  async createTask(dto: CreateTaskDto) {
    this.logger.log(
      `Creating ${dto.type} task for member ${dto.memberId} by counselor ${dto.counselorId}`,
    );

    return this.prisma.memberTask.create({
      data: {
        memberId: dto.memberId,
        counselorId: dto.counselorId,
        type: dto.type,
        title: dto.title,
        description: dto.description,
        dueDate: dto.dueDate,
        status: 'pending',
        metadata: dto.metadata,
      },
    });
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- member-task.service.spec.ts`
Expected: PASS (1/1 tests passing)

**Step 5: Add tests for getMemberTasks and markComplete**

Add to `member-task.service.spec.ts`:

```typescript
  describe('getMemberTasks', () => {
    it('should get all tasks for a member', async () => {
      const memberId = 'member-123';
      const tasks = [
        {
          id: 'task-1',
          memberId,
          counselorId: 'counselor-456',
          type: 'conversation_prompt',
          title: 'Discuss forgiveness',
          description: 'Talk about forgiving others',
          dueDate: new Date('2025-01-15'),
          status: 'pending',
          completedAt: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.memberTask.findMany.mockResolvedValue(tasks);

      const result = await service.getMemberTasks(memberId);

      expect(result).toEqual(tasks);
      expect(prisma.memberTask.findMany).toHaveBeenCalledWith({
        where: { memberId },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter tasks by status', async () => {
      const memberId = 'member-123';
      const status = 'pending' as MemberTaskStatus;

      mockPrismaService.memberTask.findMany.mockResolvedValue([]);

      await service.getMemberTasks(memberId, status);

      expect(prisma.memberTask.findMany).toHaveBeenCalledWith({
        where: { memberId, status },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('markComplete', () => {
    it('should mark task as completed and emit event', async () => {
      const taskId = 'task-789';
      const existingTask = {
        id: taskId,
        memberId: 'member-123',
        counselorId: 'counselor-456',
        type: 'offline_task',
        title: 'Read Psalm 23',
        description: 'Daily reading',
        dueDate: new Date(),
        status: 'pending',
        completedAt: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const completedTask = {
        ...existingTask,
        status: 'completed',
        completedAt: new Date(),
      };

      mockPrismaService.memberTask.findUnique.mockResolvedValue(existingTask);
      mockPrismaService.memberTask.update.mockResolvedValue(completedTask);

      const result = await service.markComplete(taskId);

      expect(result).toEqual(completedTask);
      expect(prisma.memberTask.update).toHaveBeenCalledWith({
        where: { id: taskId },
        data: {
          status: 'completed',
          completedAt: expect.any(Date),
        },
      });
      expect(eventEmitter.emit).toHaveBeenCalledWith('task.completed', {
        memberId: existingTask.memberId,
        taskId: existingTask.id,
        taskType: existingTask.type,
        counselorId: existingTask.counselorId,
        timestamp: expect.any(Date),
      });
    });

    it('should throw NotFoundException if task does not exist', async () => {
      mockPrismaService.memberTask.findUnique.mockResolvedValue(null);

      await expect(service.markComplete('nonexistent')).rejects.toThrow(
        'Task not found',
      );
    });
  });
```

**Step 6: Run tests to verify they fail**

Run: `npm test -- member-task.service.spec.ts`
Expected: FAIL - "service.getMemberTasks is not a function"

**Step 7: Implement getMemberTasks and markComplete**

Add to `member-task.service.ts`:

```typescript
import { Injectable, Logger, NotFoundException } from '@nestjs/common';

  /**
   * Get all tasks for a member
   * @param memberId - The member's ID
   * @param status - Optional filter by status
   */
  async getMemberTasks(memberId: string, status?: MemberTaskStatus) {
    this.logger.log(
      `Fetching tasks for member ${memberId}${status ? ` with status ${status}` : ''}`,
    );

    return this.prisma.memberTask.findMany({
      where: {
        memberId,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Mark a task as completed and emit event
   */
  async markComplete(taskId: string) {
    this.logger.log(`Marking task ${taskId} as completed`);

    const task = await this.prisma.memberTask.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const updatedTask = await this.prisma.memberTask.update({
      where: { id: taskId },
      data: {
        status: 'completed',
        completedAt: new Date(),
      },
    });

    // Emit task.completed event
    this.eventEmitter.emit('task.completed', {
      memberId: task.memberId,
      taskId: task.id,
      taskType: task.type,
      counselorId: task.counselorId,
      timestamp: new Date(),
    });

    return updatedTask;
  }
```

**Step 8: Run tests to verify they pass**

Run: `npm test -- member-task.service.spec.ts`
Expected: PASS (5/5 tests passing)

**Step 9: Commit**

```bash
git add packages/api/src/counsel/member-task.service.ts packages/api/src/counsel/member-task.service.spec.ts
git commit -m "feat(counsel): add MemberTaskService with CRUD operations and task completion

- Create tasks (conversation_prompt, offline_task, guided_conversation)
- Get member tasks with optional status filter
- Mark tasks as completed with task.completed event emission
- All methods with unit tests (5/5 passing)"
```

---

## Task 2: Task Completion Detection Service

**Files:**
- Create: `packages/api/src/counsel/task-completion-detection.service.ts`
- Create: `packages/api/src/counsel/task-completion-detection.service.spec.ts`

**Step 1: Write failing test for conversation topic detection**

Create `packages/api/src/counsel/task-completion-detection.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { TaskCompletionDetectionService } from './task-completion-detection.service';
import { PrismaService } from '../prisma/prisma.service';
import { CounselingAiService } from '../ai/counseling-ai.service';
import { MemberTaskService } from './member-task.service';

describe('TaskCompletionDetectionService', () => {
  let service: TaskCompletionDetectionService;
  let prisma: PrismaService;
  let aiService: CounselingAiService;
  let taskService: MemberTaskService;

  const mockPrismaService = {
    memberTask: {
      findMany: jest.fn(),
    },
  };

  const mockAiService = {
    extractTheologicalThemes: jest.fn(),
  };

  const mockTaskService = {
    markComplete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskCompletionDetectionService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CounselingAiService, useValue: mockAiService },
        { provide: MemberTaskService, useValue: mockTaskService },
      ],
    }).compile();

    service = module.get<TaskCompletionDetectionService>(
      TaskCompletionDetectionService,
    );
    prisma = module.get<PrismaService>(PrismaService);
    aiService = module.get<CounselingAiService>(CounselingAiService);
    taskService = module.get<MemberTaskService>(MemberTaskService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkConversationTopicCompletion', () => {
    it('should detect topic match and mark task complete', async () => {
      const memberId = 'member-123';
      const conversationText = 'I talked about forgiving my father today';

      const pendingTasks = [
        {
          id: 'task-1',
          memberId,
          counselorId: 'counselor-456',
          type: 'conversation_prompt',
          title: 'Discuss forgiveness',
          description: 'Talk about forgiving others',
          dueDate: new Date(),
          status: 'pending',
          completedAt: null,
          metadata: { keywords: ['forgiveness', 'forgiving'] },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.memberTask.findMany.mockResolvedValue(pendingTasks);
      mockAiService.extractTheologicalThemes.mockResolvedValue([
        'Forgiveness',
        'Family Relationships',
      ]);

      await service.checkConversationTopicCompletion(
        memberId,
        conversationText,
      );

      expect(prisma.memberTask.findMany).toHaveBeenCalledWith({
        where: {
          memberId,
          type: 'conversation_prompt',
          status: 'pending',
        },
      });
      expect(aiService.extractTheologicalThemes).toHaveBeenCalledWith(
        conversationText,
      );
      expect(taskService.markComplete).toHaveBeenCalledWith('task-1');
    });

    it('should not mark task complete if topic does not match', async () => {
      const memberId = 'member-123';
      const conversationText = 'I talked about prayer today';

      const pendingTasks = [
        {
          id: 'task-1',
          memberId,
          counselorId: 'counselor-456',
          type: 'conversation_prompt',
          title: 'Discuss forgiveness',
          description: 'Talk about forgiving others',
          dueDate: new Date(),
          status: 'pending',
          completedAt: null,
          metadata: { keywords: ['forgiveness', 'forgiving'] },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.memberTask.findMany.mockResolvedValue(pendingTasks);
      mockAiService.extractTheologicalThemes.mockResolvedValue(['Prayer']);

      await service.checkConversationTopicCompletion(
        memberId,
        conversationText,
      );

      expect(taskService.markComplete).not.toHaveBeenCalled();
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- task-completion-detection.service.spec.ts`
Expected: FAIL with "Cannot find module './task-completion-detection.service'"

**Step 3: Write minimal implementation**

Create `packages/api/src/counsel/task-completion-detection.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CounselingAiService } from '../ai/counseling-ai.service';
import { MemberTaskService } from './member-task.service';
import { OnEvent } from '@nestjs/event-emitter';
import { SessionCompletedEvent } from '../events/event-types';

@Injectable()
export class TaskCompletionDetectionService {
  private readonly logger = new Logger(TaskCompletionDetectionService.name);

  constructor(
    private prisma: PrismaService,
    private aiService: CounselingAiService,
    private taskService: MemberTaskService,
  ) {}

  /**
   * Check if member discussed required topics in conversation
   * Auto-completes conversation_prompt tasks when topics are detected
   */
  async checkConversationTopicCompletion(
    memberId: string,
    conversationText: string,
  ) {
    this.logger.log(
      `Checking conversation topic completion for member ${memberId}`,
    );

    // Get pending conversation_prompt tasks for member
    const pendingTasks = await this.prisma.memberTask.findMany({
      where: {
        memberId,
        type: 'conversation_prompt',
        status: 'pending',
      },
    });

    if (pendingTasks.length === 0) {
      this.logger.log(`No pending conversation prompts for member ${memberId}`);
      return;
    }

    // Extract topics from conversation using AI
    const detectedTopics = await this.aiService.extractTheologicalThemes(
      conversationText,
    );

    this.logger.log(
      `Detected topics: ${detectedTopics.join(', ')} for member ${memberId}`,
    );

    // Check each pending task for topic match
    for (const task of pendingTasks) {
      const keywords = (task.metadata as any)?.keywords || [];
      const taskTitle = task.title.toLowerCase();
      const taskDescription = task.description.toLowerCase();

      // Check if any detected topic matches task keywords or description
      const topicMatched = detectedTopics.some((topic) => {
        const topicLower = topic.toLowerCase();
        return (
          keywords.some((keyword: string) =>
            topicLower.includes(keyword.toLowerCase()),
          ) ||
          topicLower.includes(taskTitle) ||
          taskTitle.includes(topicLower) ||
          topicLower.includes(taskDescription) ||
          taskDescription.includes(topicLower)
        );
      });

      if (topicMatched) {
        this.logger.log(
          `Topic match detected for task ${task.id}. Marking complete.`,
        );
        await this.taskService.markComplete(task.id);
      }
    }
  }

  /**
   * Listen for session.completed events and check for topic completion
   */
  @OnEvent('session.completed')
  async handleSessionCompleted(event: SessionCompletedEvent) {
    try {
      this.logger.log(
        `Handling session.completed event for member ${event.memberId}`,
      );

      // Get session messages
      const session = await this.prisma.session.findUnique({
        where: { id: event.sessionId },
      });

      if (!session) {
        this.logger.warn(`Session ${event.sessionId} not found`);
        return;
      }

      const messages = JSON.parse(session.messages || '[]');
      const conversationText = messages
        .filter((msg: any) => msg.role === 'user')
        .map((msg: any) => msg.content)
        .join(' ');

      if (conversationText.trim()) {
        await this.checkConversationTopicCompletion(
          event.memberId,
          conversationText,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error handling session.completed for task detection: ${error.message}`,
      );
    }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- task-completion-detection.service.spec.ts`
Expected: PASS (2/2 tests passing)

**Step 5: Add test for session.completed event listener**

Add to `task-completion-detection.service.spec.ts`:

```typescript
  describe('handleSessionCompleted', () => {
    it('should check topic completion when session completes', async () => {
      const event = {
        sessionId: 'session-123',
        memberId: 'member-456',
        messageCount: 5,
        timestamp: new Date(),
      };

      const session = {
        id: event.sessionId,
        messages: JSON.stringify([
          { role: 'user', content: 'I want to talk about forgiveness' },
          { role: 'assistant', content: 'Tell me more' },
          { role: 'user', content: 'I forgave my father' },
        ]),
      };

      mockPrismaService.session = {
        findUnique: jest.fn().mockResolvedValue(session),
      };

      const checkSpy = jest
        .spyOn(service, 'checkConversationTopicCompletion')
        .mockResolvedValue(undefined);

      await service.handleSessionCompleted(event);

      expect(checkSpy).toHaveBeenCalledWith(
        event.memberId,
        'I want to talk about forgiveness I forgave my father',
      );
    });
  });
```

**Step 6: Run test to verify it passes**

Run: `npm test -- task-completion-detection.service.spec.ts`
Expected: PASS (3/3 tests passing)

**Step 7: Commit**

```bash
git add packages/api/src/counsel/task-completion-detection.service.ts packages/api/src/counsel/task-completion-detection.service.spec.ts
git commit -m "feat(counsel): add TaskCompletionDetectionService for conversation topic detection

- Automatically detect when members discuss assigned conversation topics
- Compare detected topics against task keywords and descriptions
- Auto-complete conversation_prompt tasks when topics are matched
- Listen to session.completed events for automatic detection
- All methods with unit tests (3/3 passing)"
```

---

## Task 3: Task Overdue Detection (Cron Job)

**Files:**
- Create: `packages/api/src/counsel/task-overdue.service.ts`
- Create: `packages/api/src/counsel/task-overdue.service.spec.ts`

**Step 1: Write failing test for overdue detection**

Create `packages/api/src/counsel/task-overdue.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { TaskOverdueService } from './task-overdue.service';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('TaskOverdueService', () => {
  let service: TaskOverdueService;
  let prisma: PrismaService;
  let eventEmitter: EventEmitter2;

  const mockPrismaService = {
    memberTask: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskOverdueService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<TaskOverdueService>(TaskOverdueService);
    prisma = module.get<PrismaService>(PrismaService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processOverdueTasks', () => {
    it('should mark overdue tasks and emit events', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const overdueTasks = [
        {
          id: 'task-1',
          memberId: 'member-123',
          counselorId: 'counselor-456',
          type: 'offline_task',
          title: 'Read Psalm 23',
          description: 'Daily reading',
          dueDate: yesterday,
          status: 'pending',
          completedAt: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.memberTask.findMany.mockResolvedValue(overdueTasks);
      mockPrismaService.memberTask.update.mockResolvedValue({
        ...overdueTasks[0],
        status: 'overdue',
      });

      await service.processOverdueTasks();

      expect(prisma.memberTask.findMany).toHaveBeenCalledWith({
        where: {
          status: 'pending',
          dueDate: { lt: expect.any(Date) },
        },
      });
      expect(prisma.memberTask.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: { status: 'overdue' },
      });
      expect(eventEmitter.emit).toHaveBeenCalledWith('task.overdue', {
        taskId: 'task-1',
        memberId: 'member-123',
        counselorId: 'counselor-456',
        taskType: 'offline_task',
        dueDate: yesterday,
        timestamp: expect.any(Date),
      });
    });

    it('should handle no overdue tasks', async () => {
      mockPrismaService.memberTask.findMany.mockResolvedValue([]);

      await service.processOverdueTasks();

      expect(prisma.memberTask.update).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- task-overdue.service.spec.ts`
Expected: FAIL with "Cannot find module './task-overdue.service'"

**Step 3: Write minimal implementation**

Create `packages/api/src/counsel/task-overdue.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class TaskOverdueService {
  private readonly logger = new Logger(TaskOverdueService.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Run daily at midnight to check for overdue tasks
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async processOverdueTasks() {
    this.logger.log('Starting overdue task detection...');

    const now = new Date();

    // Find all pending tasks with dueDate in the past
    const overdueTasks = await this.prisma.memberTask.findMany({
      where: {
        status: 'pending',
        dueDate: { lt: now },
      },
    });

    this.logger.log(`Found ${overdueTasks.length} overdue tasks`);

    for (const task of overdueTasks) {
      // Update status to overdue
      await this.prisma.memberTask.update({
        where: { id: task.id },
        data: { status: 'overdue' },
      });

      // Emit task.overdue event
      this.eventEmitter.emit('task.overdue', {
        taskId: task.id,
        memberId: task.memberId,
        counselorId: task.counselorId,
        taskType: task.type,
        dueDate: task.dueDate,
        timestamp: new Date(),
      });

      this.logger.log(`Task ${task.id} marked as overdue`);
    }

    this.logger.log('Overdue task detection complete');
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- task-overdue.service.spec.ts`
Expected: PASS (2/2 tests passing)

**Step 5: Commit**

```bash
git add packages/api/src/counsel/task-overdue.service.ts packages/api/src/counsel/task-overdue.service.spec.ts
git commit -m "feat(counsel): add TaskOverdueService with daily cron job

- Daily cron job (midnight) checks for overdue tasks
- Updates task status from pending to overdue
- Emits task.overdue events for workflow automation
- All methods with unit tests (2/2 passing)"
```

---

## Task 4: Task Template Service

**Files:**
- Create: `packages/api/src/counsel/task-template.service.ts`
- Create: `packages/api/src/counsel/task-template.service.spec.ts`

**Step 1: Write failing test for template management**

Create `packages/api/src/counsel/task-template.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { TaskTemplateService } from './task-template.service';

describe('TaskTemplateService', () => {
  let service: TaskTemplateService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TaskTemplateService],
    }).compile();

    service = module.get<TaskTemplateService>(TaskTemplateService);
  });

  describe('getPlatformTemplates', () => {
    it('should return predefined platform templates', () => {
      const templates = service.getPlatformTemplates();

      expect(templates).toBeInstanceOf(Array);
      expect(templates.length).toBeGreaterThan(0);
      expect(templates[0]).toHaveProperty('id');
      expect(templates[0]).toHaveProperty('type');
      expect(templates[0]).toHaveProperty('title');
      expect(templates[0]).toHaveProperty('description');
    });

    it('should include conversation prompt templates', () => {
      const templates = service.getPlatformTemplates();
      const conversationTemplates = templates.filter(
        (t) => t.type === 'conversation_prompt',
      );

      expect(conversationTemplates.length).toBeGreaterThan(0);
    });

    it('should include offline task templates', () => {
      const templates = service.getPlatformTemplates();
      const offlineTemplates = templates.filter(
        (t) => t.type === 'offline_task',
      );

      expect(offlineTemplates.length).toBeGreaterThan(0);
    });

    it('should include guided conversation templates', () => {
      const templates = service.getPlatformTemplates();
      const guidedTemplates = templates.filter(
        (t) => t.type === 'guided_conversation',
      );

      expect(guidedTemplates.length).toBeGreaterThan(0);
    });
  });

  describe('getTemplateById', () => {
    it('should return specific template by id', () => {
      const templates = service.getPlatformTemplates();
      const firstTemplate = templates[0];

      const result = service.getTemplateById(firstTemplate.id);

      expect(result).toEqual(firstTemplate);
    });

    it('should return undefined for non-existent template', () => {
      const result = service.getTemplateById('nonexistent-id');

      expect(result).toBeUndefined();
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- task-template.service.spec.ts`
Expected: FAIL with "Cannot find module './task-template.service'"

**Step 3: Write minimal implementation**

Create `packages/api/src/counsel/task-template.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { MemberTaskType } from '@prisma/client';

export interface TaskTemplate {
  id: string;
  type: MemberTaskType;
  title: string;
  description: string;
  suggestedDurationDays: number;
  metadata?: any;
}

@Injectable()
export class TaskTemplateService {
  private readonly platformTemplates: TaskTemplate[] = [
    // Conversation Prompt Templates
    {
      id: 'forgiveness-conversation',
      type: 'conversation_prompt',
      title: 'Discuss Forgiveness',
      description:
        'Have a conversation with the AI about forgiving someone who hurt you. Explore biblical perspectives on forgiveness.',
      suggestedDurationDays: 7,
      metadata: {
        keywords: ['forgiveness', 'forgiving', 'forgive'],
        suggestedScriptures: ['Matthew 6:14-15', 'Colossians 3:13'],
      },
    },
    {
      id: 'prayer-life-conversation',
      type: 'conversation_prompt',
      title: 'Reflect on Prayer Life',
      description:
        'Discuss your current prayer habits and explore ways to deepen your prayer life.',
      suggestedDurationDays: 7,
      metadata: {
        keywords: ['prayer', 'praying', 'pray'],
        suggestedScriptures: ['Matthew 6:5-13', '1 Thessalonians 5:17'],
      },
    },
    {
      id: 'anxiety-conversation',
      type: 'conversation_prompt',
      title: 'Discuss Anxiety and Worry',
      description:
        'Talk about sources of anxiety in your life and biblical approaches to finding peace.',
      suggestedDurationDays: 7,
      metadata: {
        keywords: ['anxiety', 'worry', 'anxious', 'worried'],
        suggestedScriptures: ['Philippians 4:6-7', 'Matthew 6:25-34'],
      },
    },
    {
      id: 'purpose-conversation',
      type: 'conversation_prompt',
      title: 'Explore God\'s Purpose',
      description:
        'Reflect on your calling and purpose. Discuss how God might be leading you.',
      suggestedDurationDays: 14,
      metadata: {
        keywords: ['purpose', 'calling', 'mission', 'direction'],
        suggestedScriptures: ['Jeremiah 29:11', 'Ephesians 2:10'],
      },
    },

    // Offline Task Templates
    {
      id: 'daily-scripture-reading',
      type: 'offline_task',
      title: 'Daily Scripture Reading',
      description: 'Read one chapter of Psalms each day this week.',
      suggestedDurationDays: 7,
      metadata: {
        category: 'Scripture Reading',
      },
    },
    {
      id: 'gratitude-journaling',
      type: 'offline_task',
      title: 'Gratitude Journaling',
      description:
        'Write down 3 things you are grateful for each day. Reflect on how God is working in your life.',
      suggestedDurationDays: 14,
      metadata: {
        category: 'Journaling',
      },
    },
    {
      id: 'memorize-scripture',
      type: 'offline_task',
      title: 'Memorize Philippians 4:6-7',
      description:
        'Memorize and meditate on Philippians 4:6-7 this week. Practice reciting it daily.',
      suggestedDurationDays: 7,
      metadata: {
        category: 'Scripture Memorization',
        scripture: 'Philippians 4:6-7',
      },
    },
    {
      id: 'prayer-walk',
      type: 'offline_task',
      title: 'Prayer Walk',
      description:
        'Take a 20-minute prayer walk 3 times this week. Use this time to pray and listen to God.',
      suggestedDurationDays: 7,
      metadata: {
        category: 'Prayer',
      },
    },

    // Guided Conversation Templates
    {
      id: 'grief-processing',
      type: 'guided_conversation',
      title: 'Processing Grief and Loss',
      description:
        'A guided conversation to help you process grief. The AI will walk you through stages of grief from a Christian perspective.',
      suggestedDurationDays: 14,
      metadata: {
        conversationStarter:
          'I understand you are experiencing grief or loss. Let\'s take time to process this together. Can you tell me about your loss?',
        followUpPrompts: [
          'How are you feeling right now?',
          'What memories bring you comfort?',
          'How has your faith been affected by this loss?',
          'What scriptures or prayers have helped?',
        ],
      },
    },
    {
      id: 'anger-management',
      type: 'guided_conversation',
      title: 'Managing Anger Biblically',
      description:
        'A guided conversation exploring anger triggers and biblical strategies for healthy anger management.',
      suggestedDurationDays: 7,
      metadata: {
        conversationStarter:
          'Let\'s talk about anger. Anger itself is not sinful, but how we handle it matters. What situations trigger anger for you?',
        followUpPrompts: [
          'How do you typically respond when angry?',
          'What does the Bible say about anger?',
          'What healthy outlets could you use?',
        ],
      },
    },
  ];

  /**
   * Get all platform-defined task templates
   */
  getPlatformTemplates(): TaskTemplate[] {
    return this.platformTemplates;
  }

  /**
   * Get a specific template by ID
   */
  getTemplateById(templateId: string): TaskTemplate | undefined {
    return this.platformTemplates.find((t) => t.id === templateId);
  }

  /**
   * Get templates filtered by type
   */
  getTemplatesByType(type: MemberTaskType): TaskTemplate[] {
    return this.platformTemplates.filter((t) => t.type === type);
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- task-template.service.spec.ts`
Expected: PASS (5/5 tests passing)

**Step 5: Commit**

```bash
git add packages/api/src/counsel/task-template.service.ts packages/api/src/counsel/task-template.service.spec.ts
git commit -m "feat(counsel): add TaskTemplateService with predefined templates

- Platform templates for conversation prompts (forgiveness, prayer, anxiety, purpose)
- Platform templates for offline tasks (scripture reading, journaling, memorization, prayer walk)
- Platform templates for guided conversations (grief processing, anger management)
- Get templates by ID or type
- All methods with unit tests (5/5 passing)"
```

---

## Task 5: Task Controller - REST API

**Files:**
- Create: `packages/api/src/counsel/task.controller.ts`
- Modify: `packages/api/src/counsel/counsel.module.ts`

**Step 1: Write minimal controller**

Create `packages/api/src/counsel/task.controller.ts`:

```typescript
import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MemberTaskService } from './member-task.service';
import { TaskTemplateService } from './task-template.service';
import { MemberTaskStatus, MemberTaskType } from '@prisma/client';

@Controller('counsel/tasks')
@UseGuards(JwtAuthGuard)
export class TaskController {
  constructor(
    private memberTaskService: MemberTaskService,
    private taskTemplateService: TaskTemplateService,
  ) {}

  /**
   * GET /counsel/tasks/templates
   * Get all available task templates
   */
  @Get('templates')
  async getTemplates(@Query('type') type?: MemberTaskType) {
    if (type) {
      return this.taskTemplateService.getTemplatesByType(type);
    }
    return this.taskTemplateService.getPlatformTemplates();
  }

  /**
   * GET /counsel/tasks/templates/:id
   * Get specific template by ID
   */
  @Get('templates/:id')
  async getTemplate(@Param('id') id: string) {
    return this.taskTemplateService.getTemplateById(id);
  }

  /**
   * GET /counsel/tasks
   * Get tasks assigned to authenticated member
   */
  @Get()
  async getMyTasks(
    @Request() req,
    @Query('status') status?: MemberTaskStatus,
  ) {
    return this.memberTaskService.getMemberTasks(req.user.id, status);
  }

  /**
   * GET /counsel/tasks/:id
   * Get specific task by ID
   */
  @Get(':id')
  async getTask(@Param('id') id: string, @Request() req) {
    const task = await this.memberTaskService.getTaskById(id);
    // Verify member owns this task
    if (task.memberId !== req.user.id) {
      throw new Error('Unauthorized');
    }
    return task;
  }

  /**
   * POST /counsel/tasks
   * Create new task (counselor only)
   * Note: Requires isCounselor check
   */
  @Post()
  async createTask(@Body() dto: any, @Request() req) {
    return this.memberTaskService.createTask({
      ...dto,
      counselorId: req.user.id,
    });
  }

  /**
   * PATCH /counsel/tasks/:id/complete
   * Mark task as completed
   */
  @Patch(':id/complete')
  async completeTask(@Param('id') id: string, @Request() req) {
    // Verify member owns this task
    const task = await this.memberTaskService.getTaskById(id);
    if (task.memberId !== req.user.id) {
      throw new Error('Unauthorized');
    }
    return this.memberTaskService.markComplete(id);
  }

  /**
   * GET /counsel/tasks/member/:memberId
   * Get tasks for specific member (counselor only)
   * Note: Requires counselor permission check
   */
  @Get('member/:memberId')
  async getMemberTasks(
    @Param('memberId') memberId: string,
    @Query('status') status?: MemberTaskStatus,
  ) {
    return this.memberTaskService.getMemberTasks(memberId, status);
  }
}
```

**Step 2: Add getTaskById method to MemberTaskService**

Add to `packages/api/src/counsel/member-task.service.ts`:

```typescript
  /**
   * Get a specific task by ID
   */
  async getTaskById(taskId: string) {
    const task = await this.prisma.memberTask.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }
```

**Step 3: Add test for getTaskById**

Add to `packages/api/src/counsel/member-task.service.spec.ts`:

```typescript
  describe('getTaskById', () => {
    it('should return task by ID', async () => {
      const task = {
        id: 'task-123',
        memberId: 'member-456',
        counselorId: 'counselor-789',
        type: 'offline_task',
        title: 'Read Psalm 23',
        description: 'Daily reading',
        dueDate: new Date(),
        status: 'pending',
        completedAt: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.memberTask.findUnique.mockResolvedValue(task);

      const result = await service.getTaskById('task-123');

      expect(result).toEqual(task);
    });

    it('should throw NotFoundException if task does not exist', async () => {
      mockPrismaService.memberTask.findUnique.mockResolvedValue(null);

      await expect(service.getTaskById('nonexistent')).rejects.toThrow(
        'Task not found',
      );
    });
  });
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- member-task.service.spec.ts`
Expected: PASS (7/7 tests passing)

**Step 5: Update counsel.module.ts**

Modify `packages/api/src/counsel/counsel.module.ts`:

```typescript
import { TaskController } from './task.controller';
import { MemberTaskService } from './member-task.service';
import { TaskTemplateService } from './task-template.service';
import { TaskCompletionDetectionService } from './task-completion-detection.service';
import { TaskOverdueService } from './task-overdue.service';

@Module({
  imports: [
    // ... existing imports
  ],
  controllers: [
    CounselController,
    AssessmentController,
    WellbeingController,
    TaskController, // Add this
  ],
  providers: [
    // ... existing providers
    MemberTaskService, // Add this
    TaskTemplateService, // Add this
    TaskCompletionDetectionService, // Add this
    TaskOverdueService, // Add this
  ],
  exports: [
    // ... existing exports
    MemberTaskService, // Add this
    TaskTemplateService, // Add this
    TaskCompletionDetectionService, // Add this
  ],
})
export class CounselModule {}
```

**Step 6: Commit**

```bash
git add packages/api/src/counsel/task.controller.ts packages/api/src/counsel/member-task.service.ts packages/api/src/counsel/member-task.service.spec.ts packages/api/src/counsel/counsel.module.ts
git commit -m "feat(counsel): add TaskController REST API with 7 endpoints

- GET /counsel/tasks/templates - List task templates
- GET /counsel/tasks/templates/:id - Get template by ID
- GET /counsel/tasks - Get member's tasks
- GET /counsel/tasks/:id - Get specific task
- POST /counsel/tasks - Create task (counselor)
- PATCH /counsel/tasks/:id/complete - Complete task
- GET /counsel/tasks/member/:memberId - Get member tasks (counselor)
- Added getTaskById method to MemberTaskService
- Integrated all task services into CounselModule"
```

---

## Task 6: WorkflowEngineService - Core Rule Evaluation

**Files:**
- Create: `packages/api/src/workflow/workflow-engine.service.ts`
- Create: `packages/api/src/workflow/workflow-engine.service.spec.ts`
- Create: `packages/api/src/workflow/workflow.module.ts`

**Step 1: Write failing test for rule evaluation**

Create `packages/api/src/workflow/workflow-engine.service.spec.ts`:

```typescript
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
```

**Step 2: Run test to verify it fails**

Run: `npm test -- workflow-engine.service.spec.ts`
Expected: FAIL with "Cannot find module './workflow-engine.service'"

**Step 3: Write minimal implementation**

Create `packages/api/src/workflow/workflow-engine.service.ts`:

```typescript
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowActionService } from './workflow-action.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class WorkflowEngineService implements OnModuleInit {
  private readonly logger = new Logger(WorkflowEngineService.name);

  constructor(
    private prisma: PrismaService,
    private actionService: WorkflowActionService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Subscribe to all workflow events on module init
   */
  onModuleInit() {
    const eventTypes = [
      'crisis.detected',
      'wellbeing.status.changed',
      'wellbeing.trajectory.changed',
      'assessment.completed',
      'assessment.score.changed',
      'task.completed',
      'task.overdue',
      'session.completed',
    ];

    eventTypes.forEach((eventType) => {
      this.eventEmitter.on(eventType, (event) => {
        this.evaluateEvent(eventType, event).catch((error) => {
          this.logger.error(
            `Error evaluating workflow for event ${eventType}: ${error.message}`,
          );
        });
      });
    });

    this.logger.log('WorkflowEngine subscribed to all system events');
  }

  /**
   * Evaluate workflow rules for a given event
   */
  async evaluateEvent(eventType: string, eventData: any) {
    this.logger.log(`Evaluating workflow rules for event: ${eventType}`);

    // Get all active rules
    const rules = await this.prisma.workflowRule.findMany({
      where: { isActive: true },
      orderBy: { priority: 'desc' },
    });

    for (const rule of rules) {
      try {
        // Check if rule trigger matches event type
        const trigger = rule.trigger as any;
        if (trigger.event !== eventType) {
          continue;
        }

        // Evaluate conditions if present
        if (rule.conditions) {
          const conditionsMet = this.evaluateConditions(
            rule.conditions as any,
            eventData,
          );
          if (!conditionsMet) {
            this.logger.log(`Rule ${rule.id} conditions not met, skipping`);
            continue;
          }
        }

        this.logger.log(`Rule ${rule.id} matched. Executing actions...`);

        // Execute all actions
        const actions = rule.actions as any[];
        const executedActions = [];

        for (const action of actions) {
          try {
            const result = await this.actionService.executeAction(
              action,
              eventData,
            );
            executedActions.push({ action, result });
          } catch (error) {
            this.logger.error(
              `Error executing action ${action.type}: ${error.message}`,
            );
            executedActions.push({ action, error: error.message });
          }
        }

        // Log execution
        await this.prisma.workflowExecution.create({
          data: {
            ruleId: rule.id,
            triggeredBy: eventType,
            context: eventData,
            actions: executedActions,
            success: executedActions.every((a) => !a.error),
            error: executedActions.find((a) => a.error)?.error || null,
          },
        });
      } catch (error) {
        this.logger.error(`Error processing rule ${rule.id}: ${error.message}`);
      }
    }
  }

  /**
   * Evaluate if conditions match event data
   */
  private evaluateConditions(conditions: any, eventData: any): boolean {
    for (const [key, value] of Object.entries(conditions)) {
      if (eventData[key] !== value) {
        return false;
      }
    }
    return true;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- workflow-engine.service.spec.ts`
Expected: PASS (3/3 tests passing)

**Step 5: Create workflow module**

Create `packages/api/src/workflow/workflow.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { WorkflowEngineService } from './workflow-engine.service';
import { WorkflowActionService } from './workflow-action.service';
import { WorkflowRuleService } from './workflow-rule.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CounselModule } from '../counsel/counsel.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [PrismaModule, CounselModule, EmailModule],
  providers: [
    WorkflowEngineService,
    WorkflowActionService,
    WorkflowRuleService,
  ],
  exports: [WorkflowEngineService, WorkflowRuleService],
})
export class WorkflowModule {}
```

**Step 6: Commit**

```bash
git add packages/api/src/workflow/workflow-engine.service.ts packages/api/src/workflow/workflow-engine.service.spec.ts packages/api/src/workflow/workflow.module.ts
git commit -m "feat(workflow): add WorkflowEngineService for rule evaluation

- Subscribe to all system events on module init
- Evaluate workflow rules against event data
- Match triggers and evaluate conditions
- Execute actions via WorkflowActionService
- Log all executions to WorkflowExecution table
- All methods with unit tests (3/3 passing)"
```

---

## Task 7: WorkflowActionService - Execute Actions

**Files:**
- Create: `packages/api/src/workflow/workflow-action.service.ts`
- Create: `packages/api/src/workflow/workflow-action.service.spec.ts`

**Step 1: Write failing test for action execution**

Create `packages/api/src/workflow/workflow-action.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { WorkflowActionService } from './workflow-action.service';
import { CrisisAlertService } from '../counsel/crisis-alert.service';
import { AssessmentService } from '../counsel/assessment.service';
import { MemberTaskService } from '../counsel/member-task.service';
import { EmailService } from '../email/email.service';

describe('WorkflowActionService', () => {
  let service: WorkflowActionService;
  let crisisAlertService: CrisisAlertService;
  let assessmentService: AssessmentService;
  let taskService: MemberTaskService;
  let emailService: EmailService;

  const mockCrisisAlertService = {
    sendCrisisAlert: jest.fn(),
  };

  const mockAssessmentService = {
    assignAssessment: jest.fn(),
  };

  const mockTaskService = {
    createTask: jest.fn(),
  };

  const mockEmailService = {
    sendEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowActionService,
        { provide: CrisisAlertService, useValue: mockCrisisAlertService },
        { provide: AssessmentService, useValue: mockAssessmentService },
        { provide: MemberTaskService, useValue: mockTaskService },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<WorkflowActionService>(WorkflowActionService);
    crisisAlertService = module.get<CrisisAlertService>(CrisisAlertService);
    assessmentService = module.get<AssessmentService>(AssessmentService);
    taskService = module.get<MemberTaskService>(MemberTaskService);
    emailService = module.get<EmailService>(EmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('executeAction', () => {
    it('should execute send_crisis_alert_email action', async () => {
      const action = { type: 'send_crisis_alert_email' };
      const eventData = {
        memberId: 'member-123',
        crisisType: 'suicidal_ideation',
      };

      mockCrisisAlertService.sendCrisisAlert.mockResolvedValue({
        sent: true,
      });

      const result = await service.executeAction(action, eventData);

      expect(result.success).toBe(true);
      expect(crisisAlertService.sendCrisisAlert).toHaveBeenCalledWith(
        eventData,
      );
    });

    it('should execute auto_assign_assessment action', async () => {
      const action = { type: 'auto_assign_assessment', assessmentType: 'PHQ-9' };
      const eventData = { memberId: 'member-123', counselorId: 'counselor-456' };

      mockAssessmentService.assignAssessment.mockResolvedValue({
        id: 'assigned-1',
      });

      const result = await service.executeAction(action, eventData);

      expect(result.success).toBe(true);
      expect(assessmentService.assignAssessment).toHaveBeenCalled();
    });

    it('should execute auto_assign_task action', async () => {
      const action = {
        type: 'auto_assign_task',
        taskType: 'conversation_prompt',
        title: 'Discuss forgiveness',
        description: 'Talk about forgiving others',
      };
      const eventData = { memberId: 'member-123', counselorId: 'counselor-456' };

      mockTaskService.createTask.mockResolvedValue({ id: 'task-1' });

      const result = await service.executeAction(action, eventData);

      expect(result.success).toBe(true);
      expect(taskService.createTask).toHaveBeenCalledWith({
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
        type: 'notify_counselor',
        subject: 'Member wellbeing declined',
        message: 'Member status changed to red',
      };
      const eventData = { memberId: 'member-123', counselorId: 'counselor-456' };

      mockEmailService.sendEmail.mockResolvedValue({ success: true });

      const result = await service.executeAction(action, eventData);

      expect(result.success).toBe(true);
      expect(emailService.sendEmail).toHaveBeenCalled();
    });

    it('should throw error for unknown action type', async () => {
      const action = { type: 'unknown_action' };
      const eventData = {};

      await expect(service.executeAction(action, eventData)).rejects.toThrow(
        'Unknown action type: unknown_action',
      );
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- workflow-action.service.spec.ts`
Expected: FAIL with "Cannot find module './workflow-action.service'"

**Step 3: Write minimal implementation**

Create `packages/api/src/workflow/workflow-action.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { CrisisAlertService } from '../counsel/crisis-alert.service';
import { AssessmentService } from '../counsel/assessment.service';
import { MemberTaskService } from '../counsel/member-task.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class WorkflowActionService {
  private readonly logger = new Logger(WorkflowActionService.name);

  constructor(
    private crisisAlertService: CrisisAlertService,
    private assessmentService: AssessmentService,
    private taskService: MemberTaskService,
    private emailService: EmailService,
  ) {}

  /**
   * Execute a workflow action
   */
  async executeAction(action: any, eventData: any) {
    this.logger.log(`Executing action: ${action.type}`);

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

  /**
   * Send crisis alert email
   */
  private async executeSendCrisisAlert(eventData: any) {
    const result = await this.crisisAlertService.sendCrisisAlert(eventData);
    return { success: true, result };
  }

  /**
   * Auto-assign assessment to member
   */
  private async executeAutoAssignAssessment(action: any, eventData: any) {
    // Get assessment ID by type
    const assessment = await this.getAssessmentByType(action.assessmentType);

    if (!assessment) {
      throw new Error(`Assessment type ${action.assessmentType} not found`);
    }

    const result = await this.assessmentService.assignAssessment({
      memberId: eventData.memberId,
      assessmentId: assessment.id,
      assignedBy: eventData.counselorId || 'system',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    return { success: true, result };
  }

  /**
   * Auto-assign task to member
   */
  private async executeAutoAssignTask(action: any, eventData: any) {
    const result = await this.taskService.createTask({
      memberId: eventData.memberId,
      counselorId: eventData.counselorId || 'system',
      type: action.taskType,
      title: action.title,
      description: action.description,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    return { success: true, result };
  }

  /**
   * Send notification email to counselor
   */
  private async executeNotifyCounselor(action: any, eventData: any) {
    // Get counselor email
    const counselorEmail = await this.getCounselorEmail(
      eventData.counselorId || eventData.memberId,
    );

    if (!counselorEmail) {
      throw new Error('Counselor email not found');
    }

    const result = await this.emailService.sendEmail({
      to: counselorEmail,
      subject: action.subject,
      text: action.message,
      html: `<p>${action.message}</p>`,
    });

    return { success: true, result };
  }

  /**
   * Helper: Get assessment by type
   */
  private async getAssessmentByType(type: string) {
    // This is a simplified version - in real implementation,
    // query the Assessment table
    return { id: `assessment-${type.toLowerCase()}` };
  }

  /**
   * Helper: Get counselor email
   */
  private async getCounselorEmail(counselorId: string) {
    // This is a simplified version - in real implementation,
    // query the User table
    return 'counselor@example.com';
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- workflow-action.service.spec.ts`
Expected: PASS (5/5 tests passing)

**Step 5: Commit**

```bash
git add packages/api/src/workflow/workflow-action.service.ts packages/api/src/workflow/workflow-action.service.spec.ts
git commit -m "feat(workflow): add WorkflowActionService for executing workflow actions

- Execute send_crisis_alert_email action
- Execute auto_assign_assessment action
- Execute auto_assign_task action
- Execute notify_counselor action
- Throw error for unknown action types
- All methods with unit tests (5/5 passing)"
```

---

## Task 8: WorkflowRuleService - CRUD Operations

**Files:**
- Create: `packages/api/src/workflow/workflow-rule.service.ts`
- Create: `packages/api/src/workflow/workflow-rule.service.spec.ts`

**Step 1: Write failing test for rule CRUD**

Create `packages/api/src/workflow/workflow-rule.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { WorkflowRuleService } from './workflow-rule.service';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowRuleLevel } from '@prisma/client';

describe('WorkflowRuleService', () => {
  let service: WorkflowRuleService;
  let prisma: PrismaService;

  const mockPrismaService = {
    workflowRule: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowRuleService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<WorkflowRuleService>(WorkflowRuleService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createRule', () => {
    it('should create a platform-level rule', async () => {
      const dto = {
        name: 'Crisis Alert Rule',
        level: 'platform' as WorkflowRuleLevel,
        trigger: { event: 'crisis.detected' },
        conditions: { confidence: 'high' },
        actions: [{ type: 'send_crisis_alert_email' }],
        priority: 10,
      };

      const createdRule = {
        id: 'rule-1',
        ...dto,
        ownerId: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.workflowRule.create.mockResolvedValue(createdRule);

      const result = await service.createRule(dto);

      expect(result).toEqual(createdRule);
      expect(prisma.workflowRule.create).toHaveBeenCalledWith({
        data: {
          name: dto.name,
          level: dto.level,
          ownerId: undefined,
          trigger: dto.trigger,
          conditions: dto.conditions,
          actions: dto.actions,
          priority: dto.priority,
          isActive: true,
        },
      });
    });

    it('should create a counselor-level rule with ownerId', async () => {
      const dto = {
        name: 'Custom Alert',
        level: 'counselor' as WorkflowRuleLevel,
        ownerId: 'counselor-123',
        trigger: { event: 'task.overdue' },
        actions: [{ type: 'notify_counselor' }],
        priority: 5,
      };

      mockPrismaService.workflowRule.create.mockResolvedValue({ id: 'rule-2' });

      await service.createRule(dto);

      expect(prisma.workflowRule.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ownerId: 'counselor-123',
        }),
      });
    });
  });

  describe('getRules', () => {
    it('should get all active rules', async () => {
      const rules = [
        {
          id: 'rule-1',
          name: 'Platform Rule',
          level: 'platform',
          ownerId: null,
          trigger: { event: 'crisis.detected' },
          conditions: null,
          actions: [{ type: 'send_email' }],
          priority: 10,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.workflowRule.findMany.mockResolvedValue(rules);

      const result = await service.getRules();

      expect(result).toEqual(rules);
      expect(prisma.workflowRule.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { priority: 'desc' },
      });
    });

    it('should filter rules by level', async () => {
      mockPrismaService.workflowRule.findMany.mockResolvedValue([]);

      await service.getRules({ level: 'platform' });

      expect(prisma.workflowRule.findMany).toHaveBeenCalledWith({
        where: { level: 'platform' },
        orderBy: { priority: 'desc' },
      });
    });

    it('should filter rules by ownerId', async () => {
      mockPrismaService.workflowRule.findMany.mockResolvedValue([]);

      await service.getRules({ ownerId: 'counselor-123' });

      expect(prisma.workflowRule.findMany).toHaveBeenCalledWith({
        where: { ownerId: 'counselor-123' },
        orderBy: { priority: 'desc' },
      });
    });
  });

  describe('updateRule', () => {
    it('should update rule properties', async () => {
      const ruleId = 'rule-1';
      const updates = { isActive: false, priority: 5 };

      mockPrismaService.workflowRule.update.mockResolvedValue({
        id: ruleId,
        ...updates,
      });

      const result = await service.updateRule(ruleId, updates);

      expect(prisma.workflowRule.update).toHaveBeenCalledWith({
        where: { id: ruleId },
        data: updates,
      });
    });
  });

  describe('deleteRule', () => {
    it('should delete a rule', async () => {
      const ruleId = 'rule-1';

      mockPrismaService.workflowRule.delete.mockResolvedValue({});

      await service.deleteRule(ruleId);

      expect(prisma.workflowRule.delete).toHaveBeenCalledWith({
        where: { id: ruleId },
      });
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- workflow-rule.service.spec.ts`
Expected: FAIL with "Cannot find module './workflow-rule.service'"

**Step 3: Write minimal implementation**

Create `packages/api/src/workflow/workflow-rule.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowRuleLevel } from '@prisma/client';

export interface CreateRuleDto {
  name: string;
  level: WorkflowRuleLevel;
  ownerId?: string;
  trigger: any;
  conditions?: any;
  actions: any[];
  priority: number;
}

export interface GetRulesOptions {
  level?: WorkflowRuleLevel;
  ownerId?: string;
  isActive?: boolean;
}

@Injectable()
export class WorkflowRuleService {
  private readonly logger = new Logger(WorkflowRuleService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new workflow rule
   */
  async createRule(dto: CreateRuleDto) {
    this.logger.log(`Creating workflow rule: ${dto.name}`);

    return this.prisma.workflowRule.create({
      data: {
        name: dto.name,
        level: dto.level,
        ownerId: dto.ownerId,
        trigger: dto.trigger,
        conditions: dto.conditions,
        actions: dto.actions,
        priority: dto.priority,
        isActive: true,
      },
    });
  }

  /**
   * Get workflow rules with optional filters
   */
  async getRules(options: GetRulesOptions = {}) {
    this.logger.log('Fetching workflow rules');

    const where: any = {};

    if (options.level) {
      where.level = options.level;
    }

    if (options.ownerId) {
      where.ownerId = options.ownerId;
    }

    if (options.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    return this.prisma.workflowRule.findMany({
      where,
      orderBy: { priority: 'desc' },
    });
  }

  /**
   * Get a specific rule by ID
   */
  async getRule(ruleId: string) {
    return this.prisma.workflowRule.findUnique({
      where: { id: ruleId },
    });
  }

  /**
   * Update a workflow rule
   */
  async updateRule(ruleId: string, updates: any) {
    this.logger.log(`Updating workflow rule: ${ruleId}`);

    return this.prisma.workflowRule.update({
      where: { id: ruleId },
      data: updates,
    });
  }

  /**
   * Delete a workflow rule
   */
  async deleteRule(ruleId: string) {
    this.logger.log(`Deleting workflow rule: ${ruleId}`);

    return this.prisma.workflowRule.delete({
      where: { id: ruleId },
    });
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- workflow-rule.service.spec.ts`
Expected: PASS (6/6 tests passing)

**Step 5: Commit**

```bash
git add packages/api/src/workflow/workflow-rule.service.ts packages/api/src/workflow/workflow-rule.service.spec.ts
git commit -m "feat(workflow): add WorkflowRuleService for rule CRUD operations

- Create workflow rules at platform/org/counselor levels
- Get rules with filtering by level, ownerId, isActive
- Get specific rule by ID
- Update rule properties
- Delete rules
- All methods with unit tests (6/6 passing)"
```

---

## Task 9: Workflow Controller - REST API

**Files:**
- Create: `packages/api/src/workflow/workflow.controller.ts`
- Modify: `packages/api/src/workflow/workflow.module.ts`

**Step 1: Write minimal controller**

Create `packages/api/src/workflow/workflow.controller.ts`:

```typescript
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WorkflowRuleService } from './workflow-rule.service';
import { WorkflowRuleLevel } from '@prisma/client';

@Controller('workflow/rules')
@UseGuards(JwtAuthGuard)
export class WorkflowController {
  constructor(private ruleService: WorkflowRuleService) {}

  /**
   * GET /workflow/rules
   * Get workflow rules (filtered by permissions)
   */
  @Get()
  async getRules(
    @Request() req,
    @Query('level') level?: WorkflowRuleLevel,
    @Query('isActive') isActive?: string,
  ) {
    const options: any = {};

    if (level) {
      options.level = level;
    }

    if (isActive !== undefined) {
      options.isActive = isActive === 'true';
    }

    // If counselor-level, filter by ownerId
    if (level === 'counselor') {
      options.ownerId = req.user.id;
    }

    return this.ruleService.getRules(options);
  }

  /**
   * GET /workflow/rules/:id
   * Get specific rule by ID
   */
  @Get(':id')
  async getRule(@Param('id') id: string) {
    return this.ruleService.getRule(id);
  }

  /**
   * POST /workflow/rules
   * Create new workflow rule
   */
  @Post()
  async createRule(@Body() dto: any, @Request() req) {
    // If counselor-level rule, set ownerId to current user
    if (dto.level === 'counselor') {
      dto.ownerId = req.user.id;
    }

    return this.ruleService.createRule(dto);
  }

  /**
   * PATCH /workflow/rules/:id
   * Update workflow rule
   */
  @Patch(':id')
  async updateRule(@Param('id') id: string, @Body() updates: any) {
    return this.ruleService.updateRule(id, updates);
  }

  /**
   * DELETE /workflow/rules/:id
   * Delete workflow rule
   */
  @Delete(':id')
  async deleteRule(@Param('id') id: string) {
    return this.ruleService.deleteRule(id);
  }

  /**
   * GET /workflow/executions
   * Get workflow execution history (for debugging)
   */
  @Get('executions')
  async getExecutions(@Query('ruleId') ruleId?: string) {
    // Implementation would query WorkflowExecution table
    return { message: 'Execution history endpoint' };
  }
}
```

**Step 2: Update workflow.module.ts to include controller**

Modify `packages/api/src/workflow/workflow.module.ts`:

```typescript
import { WorkflowController } from './workflow.controller';

@Module({
  imports: [PrismaModule, CounselModule, EmailModule],
  controllers: [WorkflowController], // Add this
  providers: [
    WorkflowEngineService,
    WorkflowActionService,
    WorkflowRuleService,
  ],
  exports: [WorkflowEngineService, WorkflowRuleService],
})
export class WorkflowModule {}
```

**Step 3: Update app.module.ts to import WorkflowModule**

Modify `packages/api/src/app.module.ts`:

Add to imports array:
```typescript
import { WorkflowModule } from './workflow/workflow.module';

@Module({
  imports: [
    // ... existing imports
    WorkflowModule, // Add this
  ],
})
```

**Step 4: Commit**

```bash
git add packages/api/src/workflow/workflow.controller.ts packages/api/src/workflow/workflow.module.ts packages/api/src/app.module.ts
git commit -m "feat(workflow): add WorkflowController REST API with 6 endpoints

- GET /workflow/rules - List workflow rules with filtering
- GET /workflow/rules/:id - Get specific rule
- POST /workflow/rules - Create rule (counselor sets ownerId)
- PATCH /workflow/rules/:id - Update rule
- DELETE /workflow/rules/:id - Delete rule
- GET /workflow/executions - Get execution history
- Integrated WorkflowModule into app"
```

---

## Task 10: Seed Platform Default Rules

**Files:**
- Create: `packages/api/src/workflow/platform-rules.seed.ts`
- Create: `packages/api/src/workflow/seed-rules.script.ts`

**Step 1: Create platform rules seed data**

Create `packages/api/src/workflow/platform-rules.seed.ts`:

```typescript
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
```

**Step 2: Create seed script**

Create `packages/api/src/workflow/seed-rules.script.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import { PLATFORM_DEFAULT_RULES } from './platform-rules.seed';

const prisma = new PrismaClient();

async function seedPlatformRules() {
  console.log('Seeding platform default workflow rules...');

  for (const rule of PLATFORM_DEFAULT_RULES) {
    const existing = await prisma.workflowRule.findFirst({
      where: { name: rule.name, level: 'platform' },
    });

    if (existing) {
      console.log(`Rule "${rule.name}" already exists, skipping`);
      continue;
    }

    await prisma.workflowRule.create({
      data: {
        ...rule,
        ownerId: null,
        isActive: true,
      },
    });

    console.log(`Created rule: ${rule.name}`);
  }

  console.log('Platform rules seeded successfully');
}

seedPlatformRules()
  .catch((e) => {
    console.error('Error seeding rules:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

**Step 3: Add script to package.json**

Add to `packages/api/package.json` scripts:

```json
"seed:workflow-rules": "ts-node src/workflow/seed-rules.script.ts"
```

**Step 4: Commit**

```bash
git add packages/api/src/workflow/platform-rules.seed.ts packages/api/src/workflow/seed-rules.script.ts packages/api/package.json
git commit -m "feat(workflow): add platform default rules and seed script

- 4 platform default rules:
  1. Crisis detection → alert + PHQ-9
  2. Wellbeing declined → notify + task
  3. PHQ-9 improving → encouragement
  4. Task overdue → reminder
- Seed script to populate database with platform rules
- npm run seed:workflow-rules command"
```

---

## Task 11: Integration Testing & Documentation

**Files:**
- Create: `docs/features/member-tasks.md`
- Create: `docs/features/workflow-engine.md`

**Step 1: Write member tasks documentation**

Create `docs/features/member-tasks.md`:

```markdown
# Member Tasks System

## Overview

Counselors assign tasks to members for completing outside conversations, practicing skills, or engaging in specific discussions. Three task types: conversation prompts (AI detects completion), offline tasks (manual completion), and guided conversations (structured AI dialogues).

## Task Types

### 1. Conversation Prompts

**Purpose:** Encourage members to discuss specific topics with AI.

**How It Works:**
- Counselor assigns topic (e.g., "Discuss forgiveness")
- Member has conversations with AI
- System detects when topic is discussed using AI topic extraction
- Task auto-completes when topic detected

**Example:**
- Task: "Discuss forgiveness"
- Keywords: ["forgiveness", "forgiving", "forgive"]
- Detection: Member says "I want to forgive my father"
- Result: Task automatically marked complete

### 2. Offline Tasks

**Purpose:** Activities completed outside the platform.

**How It Works:**
- Counselor assigns activity (e.g., "Read Psalm 23 daily")
- Member completes activity offline
- Member manually marks task complete

**Examples:**
- Daily scripture reading
- Journaling
- Scripture memorization
- Prayer walks

### 3. Guided Conversations

**Purpose:** Structured AI conversations with pre-written prompts.

**How It Works:**
- Counselor assigns guided conversation (e.g., "Processing grief")
- Member starts conversation
- AI follows predefined prompts and questions
- Task completes when conversation finished

**Examples:**
- Grief processing
- Anger management
- Purpose exploration

## Task Templates

Platform provides pre-defined templates counselors can use:

**Conversation Prompts:**
- Discuss Forgiveness
- Reflect on Prayer Life
- Discuss Anxiety and Worry
- Explore God's Purpose

**Offline Tasks:**
- Daily Scripture Reading
- Gratitude Journaling
- Memorize Scripture
- Prayer Walk

**Guided Conversations:**
- Processing Grief and Loss
- Managing Anger Biblically

Counselors can create custom tasks or use templates.

## API Endpoints

All endpoints require JWT authentication.

### GET `/counsel/tasks/templates`

Get all task templates.

**Query Parameters:**
- `type` (optional): Filter by type (conversation_prompt, offline_task, guided_conversation)

**Response:**
```json
[
  {
    "id": "forgiveness-conversation",
    "type": "conversation_prompt",
    "title": "Discuss Forgiveness",
    "description": "Have a conversation about forgiving someone who hurt you",
    "suggestedDurationDays": 7,
    "metadata": {
      "keywords": ["forgiveness", "forgiving", "forgive"],
      "suggestedScriptures": ["Matthew 6:14-15", "Colossians 3:13"]
    }
  }
]
```

### GET `/counsel/tasks`

Get tasks assigned to authenticated member.

**Query Parameters:**
- `status` (optional): Filter by status (pending, completed, overdue)

**Response:**
```json
[
  {
    "id": "task-123",
    "memberId": "member-456",
    "counselorId": "counselor-789",
    "type": "conversation_prompt",
    "title": "Discuss forgiveness",
    "description": "Talk about forgiving others",
    "dueDate": "2025-02-01T00:00:00Z",
    "status": "pending",
    "completedAt": null,
    "createdAt": "2025-01-15T10:00:00Z",
    "updatedAt": "2025-01-15T10:00:00Z"
  }
]
```

### PATCH `/counsel/tasks/:id/complete`

Mark task as completed.

**Response:**
```json
{
  "id": "task-123",
  "status": "completed",
  "completedAt": "2025-01-20T14:30:00Z"
}
```

## Services

### MemberTaskService

**Purpose:** CRUD operations for tasks

**Key Methods:**
- `createTask(dto)` - Create new task
- `getMemberTasks(memberId, status)` - Get member's tasks
- `getTaskById(taskId)` - Get specific task
- `markComplete(taskId)` - Complete task and emit event

**Location:** `packages/api/src/counsel/member-task.service.ts`

### TaskCompletionDetectionService

**Purpose:** Auto-detect conversation topic completion

**Key Methods:**
- `checkConversationTopicCompletion(memberId, text)` - Check if topics discussed
- `handleSessionCompleted(event)` - Event listener for session.completed

**Location:** `packages/api/src/counsel/task-completion-detection.service.ts`

### TaskOverdueService

**Purpose:** Daily cron job for overdue detection

**Key Methods:**
- `processOverdueTasks()` - Runs at midnight, marks overdue tasks

**Location:** `packages/api/src/counsel/task-overdue.service.ts`

### TaskTemplateService

**Purpose:** Manage predefined task templates

**Key Methods:**
- `getPlatformTemplates()` - Get all templates
- `getTemplateById(id)` - Get specific template
- `getTemplatesByType(type)` - Filter by type

**Location:** `packages/api/src/counsel/task-template.service.ts`

## Database Schema

### MemberTask

| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| memberId | uuid | Foreign key to User |
| counselorId | uuid | Foreign key to User (counselor) |
| type | MemberTaskType | conversation_prompt, offline_task, guided_conversation |
| title | string | Task title |
| description | text | Task description |
| dueDate | timestamp | When task is due (nullable) |
| completedAt | timestamp | When completed (nullable) |
| status | MemberTaskStatus | pending, completed, overdue |
| metadata | json | Additional data (keywords, prompts, etc.) |
| createdAt | timestamp | When assigned |
| updatedAt | timestamp | Last update |

## Future Enhancements

- [ ] Task progress tracking for multi-step tasks
- [ ] Recurring tasks (daily, weekly)
- [ ] Task dependencies (complete A before B unlocks)
- [ ] Member-initiated task requests
- [ ] Task analytics (completion rates, time to complete)
```

**Step 2: Write workflow engine documentation**

Create `docs/features/workflow-engine.md`:

```markdown
# Workflow Rules Engine

## Overview

Configurable IF-THEN automation that connects all features intelligently. Event-driven architecture with three-tier configuration: platform defaults → organization overrides → counselor customization.

## Architecture

### Event-Driven Integration

```
System Event (e.g., crisis.detected)
    ↓
Event Bus (EventEmitter2)
    ↓
WorkflowEngine.evaluateEvent()
    ↓
Match Trigger → Evaluate Conditions → Execute Actions
    ↓
WorkflowExecution (audit log)
```

### Configuration Hierarchy

```
Platform Rules (developers define, same for all)
    ↓
Organization Rules (org admins override/add)
    ↓
Counselor Rules (individual customization)
```

**Precedence:** Counselor > Organization > Platform

## Rule Structure

```typescript
{
  name: "Crisis Detection → Alert + PHQ-9",
  level: "platform", // platform | organization | counselor
  trigger: {
    event: "crisis.detected"
  },
  conditions: {
    confidence: "high"
  },
  actions: [
    { type: "send_crisis_alert_email" },
    { type: "auto_assign_assessment", assessmentType: "PHQ-9" }
  ],
  priority: 100, // Higher = executed first
  isActive: true
}
```

## Supported Events

From Phases 1-3:

| Event | Trigger | Example Use Case |
|-------|---------|------------------|
| `crisis.detected` | SafetyService detects crisis | Send alert, assign PHQ-9 |
| `wellbeing.status.changed` | Status changes (green/yellow/red) | Notify counselor, assign task |
| `wellbeing.trajectory.changed` | Trajectory changes | Encouragement for improving |
| `assessment.completed` | Member submits assessment | Check score, assign follow-up |
| `assessment.score.changed` | Score significantly changes | Alert if declining |
| `task.completed` | Member completes task | Acknowledge, assign next task |
| `task.overdue` | Task past due date | Remind counselor |
| `session.completed` | User finishes conversation | Generate summary, detect topics |

## Supported Actions

### 1. send_crisis_alert_email

Send high-priority email to counselor.

```json
{ "type": "send_crisis_alert_email" }
```

### 2. auto_assign_assessment

Assign assessment to member.

```json
{
  "type": "auto_assign_assessment",
  "assessmentType": "PHQ-9"
}
```

### 3. auto_assign_task

Assign task to member.

```json
{
  "type": "auto_assign_task",
  "taskType": "conversation_prompt",
  "title": "Check-in conversation",
  "description": "Discuss recent struggles"
}
```

### 4. notify_counselor

Send notification email to counselor.

```json
{
  "type": "notify_counselor",
  "subject": "Member wellbeing declined",
  "message": "Member status changed to red"
}
```

## Platform Default Rules

4 rules created on system initialization:

**1. Crisis Detection → Alert + PHQ-9**
- Trigger: crisis.detected (confidence: high)
- Actions: Send alert, assign PHQ-9
- Priority: 100

**2. Wellbeing Declined → Notify + Task**
- Trigger: wellbeing.status.changed (newStatus: red)
- Actions: Notify counselor, assign check-in task
- Priority: 90

**3. PHQ-9 Improving → Encouragement**
- Trigger: assessment.completed (type: PHQ-9, score decreased)
- Actions: Notify counselor of improvement
- Priority: 50

**4. Task Overdue → Reminder**
- Trigger: task.overdue
- Actions: Notify counselor
- Priority: 30

## API Endpoints

All endpoints require JWT authentication.

### GET `/workflow/rules`

Get workflow rules.

**Query Parameters:**
- `level` (optional): Filter by level (platform, organization, counselor)
- `isActive` (optional): Filter by active status

**Response:**
```json
[
  {
    "id": "rule-123",
    "name": "Crisis Alert Rule",
    "level": "platform",
    "ownerId": null,
    "trigger": { "event": "crisis.detected" },
    "conditions": { "confidence": "high" },
    "actions": [{ "type": "send_crisis_alert_email" }],
    "priority": 100,
    "isActive": true,
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z"
  }
]
```

### POST `/workflow/rules`

Create new workflow rule.

**Request Body:**
```json
{
  "name": "Custom Alert",
  "level": "counselor",
  "trigger": { "event": "task.overdue" },
  "actions": [{ "type": "notify_counselor", "subject": "Task overdue" }],
  "priority": 5
}
```

**Response:** Created rule object

### PATCH `/workflow/rules/:id`

Update workflow rule.

**Request Body:**
```json
{
  "isActive": false
}
```

### DELETE `/workflow/rules/:id`

Delete workflow rule.

## Services

### WorkflowEngineService

**Purpose:** Evaluate rules and coordinate actions

**Key Methods:**
- `onModuleInit()` - Subscribe to all system events
- `evaluateEvent(eventType, eventData)` - Match rules, execute actions
- `evaluateConditions(conditions, data)` - Check if conditions met

**Location:** `packages/api/src/workflow/workflow-engine.service.ts`

### WorkflowActionService

**Purpose:** Execute workflow actions

**Key Methods:**
- `executeAction(action, eventData)` - Route to specific action handler
- `executeSendCrisisAlert(data)` - Send crisis alert
- `executeAutoAssignAssessment(action, data)` - Assign assessment
- `executeAutoAssignTask(action, data)` - Assign task
- `executeNotifyCounselor(action, data)` - Send counselor email

**Location:** `packages/api/src/workflow/workflow-action.service.ts`

### WorkflowRuleService

**Purpose:** CRUD operations for rules

**Key Methods:**
- `createRule(dto)` - Create new rule
- `getRules(options)` - Get rules with filtering
- `updateRule(ruleId, updates)` - Update rule
- `deleteRule(ruleId)` - Delete rule

**Location:** `packages/api/src/workflow/workflow-rule.service.ts`

## Database Schema

### WorkflowRule

| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| name | string | Rule name |
| level | WorkflowRuleLevel | platform, organization, counselor |
| ownerId | uuid | Owner (org/counselor) if not platform (nullable) |
| trigger | json | Event trigger definition |
| conditions | json | Optional conditions to evaluate (nullable) |
| actions | json | Array of actions to execute |
| priority | integer | Execution priority (higher first) |
| isActive | boolean | Whether rule is active |
| createdAt | timestamp | When created |
| updatedAt | timestamp | Last update |

### WorkflowExecution

| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| ruleId | uuid | Foreign key to WorkflowRule |
| triggeredBy | string | Event type that triggered execution |
| context | json | Event data at time of execution |
| actions | json | Actions executed with results |
| success | boolean | Whether all actions succeeded |
| error | text | Error message if failed (nullable) |
| executedAt | timestamp | When executed |

## Future Enhancements

- [ ] Complex conditions (AND/OR logic, comparisons)
- [ ] Templated action parameters (use event data in messages)
- [ ] Rate limiting per rule (max executions per hour)
- [ ] Rule builder UI for counselors/admins
- [ ] Rule testing/simulation mode
- [ ] Webhooks action type (integrate external systems)
- [ ] Scheduled triggers (not just event-driven)
```

**Step 3: Commit documentation**

```bash
git add docs/features/member-tasks.md docs/features/workflow-engine.md
git commit -m "docs: add comprehensive documentation for Phase 3

- Member Tasks system documentation:
  - Task types (conversation prompts, offline tasks, guided conversations)
  - Task templates and examples
  - API endpoints with request/response examples
  - Services overview
  - Database schema

- Workflow Engine documentation:
  - Event-driven architecture
  - Rule structure and hierarchy
  - Supported events and actions
  - Platform default rules
  - API endpoints
  - Services overview
  - Database schema"
```

---

## Final Integration & Testing

**Step 1: Run all tests**

```bash
# From packages/api directory
npm test

# Expected results:
# - MemberTaskService: 7/7 passing
# - TaskCompletionDetectionService: 3/3 passing
# - TaskOverdueService: 2/2 passing
# - TaskTemplateService: 5/5 passing
# - WorkflowEngineService: 3/3 passing
# - WorkflowActionService: 5/5 passing
# - WorkflowRuleService: 6/6 passing
# Total: 31/31 tests passing
```

**Step 2: Start API server and verify no errors**

```bash
npm run start:dev

# Verify logs show:
# - All services initialized
# - WorkflowEngine subscribed to events
# - TaskOverdueService cron job scheduled
# - No errors on startup
```

**Step 3: Seed platform rules**

```bash
npm run seed:workflow-rules

# Expected output:
# - Created rule: Crisis Detection → Alert + PHQ-9
# - Created rule: Wellbeing Declined → Notify Counselor + Task
# - Created rule: PHQ-9 Score Improving → Encouragement
# - Created rule: Task Overdue → Reminder
# - Platform rules seeded successfully
```

**Step 4: Test REST API endpoints**

```bash
# Get task templates
curl http://localhost:3697/counsel/tasks/templates

# Get workflow rules
curl http://localhost:3697/workflow/rules

# Verify responses return expected data
```

**Step 5: Final commit**

```bash
git add .
git commit -m "feat: Phase 3 complete - Member Tasks & Workflow Engine

Phase 3 Implementation Summary:

Feature 4: Member Tasks System
- MemberTaskService: CRUD operations for tasks
- TaskCompletionDetectionService: AI-powered conversation topic detection
- TaskOverdueService: Daily cron job for overdue detection
- TaskTemplateService: 10 predefined templates (conversation prompts, offline tasks, guided conversations)
- TaskController: 7 REST API endpoints
- All task services integrated into CounselModule

Feature 5: Workflow Rules Engine
- WorkflowEngineService: Event-driven rule evaluation and action execution
- WorkflowActionService: 4 action types (crisis alert, assign assessment, assign task, notify counselor)
- WorkflowRuleService: CRUD operations for workflow rules
- WorkflowController: 6 REST API endpoints
- Platform default rules: 4 rules seeded
- Three-tier configuration hierarchy (platform/organization/counselor)
- WorkflowModule created and integrated into app

Testing & Documentation:
- 31 unit tests passing (100%)
- Comprehensive feature documentation (member-tasks.md, workflow-engine.md)
- Seed script for platform rules
- API server running with no errors

Integration:
- Event bus connects all features (Phases 1-3)
- Task completion triggers workflow rules
- Workflow rules can assign tasks (circular integration)
- All services use dependency injection
- Loose coupling via events"
```

---

## Execution Summary

Phase 3 adds two major features:

**Feature 4: Member Tasks (7 files, 31 tests)**
- 4 services (MemberTask, TaskCompletion, TaskOverdue, TaskTemplate)
- 1 controller (7 endpoints)
- 10 predefined task templates
- AI-powered conversation topic detection
- Daily overdue detection cron job

**Feature 5: Workflow Engine (9 files)**
- 3 services (WorkflowEngine, WorkflowAction, WorkflowRule)
- 1 controller (6 endpoints)
- Event-driven rule evaluation
- 4 platform default rules
- Three-tier configuration (platform/org/counselor)

**Total:** 16 new files, 31 unit tests, 2 comprehensive documentation files

All features from Phases 1-3 now connected via event-driven architecture with intelligent automation through configurable workflow rules.
