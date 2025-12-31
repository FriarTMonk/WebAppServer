import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowActionService } from './workflow-action.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EVENT_TYPES } from '../events/event-types';

// Type definitions for workflow structures
interface WorkflowTrigger {
  event: string;
}

interface WorkflowConditions {
  [key: string]: any;
}

interface WorkflowAction {
  type: string;
  [key: string]: any;
}

@Injectable()
export class WorkflowEngineService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkflowEngineService.name);
  private eventHandlers: Map<string, (event: any) => void> = new Map();

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
      EVENT_TYPES.CRISIS_DETECTED,
      EVENT_TYPES.WELLBEING_STATUS_CHANGED,
      EVENT_TYPES.WELLBEING_TRAJECTORY_CHANGED,
      EVENT_TYPES.ASSESSMENT_COMPLETED,
      EVENT_TYPES.ASSESSMENT_SCORE_CHANGED,
      EVENT_TYPES.TASK_COMPLETED,
      EVENT_TYPES.TASK_OVERDUE,
      EVENT_TYPES.SESSION_COMPLETED,
    ];

    eventTypes.forEach((eventType) => {
      const handler = (event: any) => {
        this.evaluateEvent(eventType, event).catch((error) => {
          const errorMessage =
            error instanceof Error
              ? error.stack || error.message
              : String(error);
          this.logger.error(
            `Error evaluating workflow for event ${eventType}:`,
            errorMessage,
          );
        });
      };

      this.eventHandlers.set(eventType, handler);
      this.eventEmitter.on(eventType, handler);
    });

    this.logger.log('WorkflowEngine subscribed to all system events');
  }

  /**
   * Clean up event listeners on module destroy
   */
  onModuleDestroy() {
    this.eventHandlers.forEach((handler, eventType) => {
      this.eventEmitter.off(eventType, handler);
    });
    this.logger.log('WorkflowEngine unsubscribed from all system events');
  }

  /**
   * Evaluate workflow rules for a given event
   */
  async evaluateEvent(eventType: string, eventData: Record<string, any>) {
    this.logger.log(`Evaluating workflow rules for event: ${eventType}`);

    // Get all active rules
    const rules = await this.prisma.workflowRule.findMany({
      where: { isActive: true },
      orderBy: { priority: 'desc' },
    });

    for (const rule of rules) {
      try {
        // Check if rule trigger matches event type
        if (!this.validateTrigger(rule.trigger)) {
          this.logger.warn(`Rule ${rule.id} has invalid trigger, skipping`);
          continue;
        }

        const trigger = rule.trigger as WorkflowTrigger;
        if (trigger.event !== eventType) {
          continue;
        }

        // Evaluate conditions if present
        if (rule.conditions) {
          if (!this.validateConditions(rule.conditions)) {
            this.logger.warn(`Rule ${rule.id} has invalid conditions, skipping`);
            continue;
          }

          const conditionsMet = this.evaluateConditions(
            rule.conditions as WorkflowConditions,
            eventData,
          );
          if (!conditionsMet) {
            this.logger.log(`Rule ${rule.id} conditions not met, skipping`);
            continue;
          }
        }

        this.logger.log(`Rule ${rule.id} matched. Executing actions...`);

        // Validate actions
        if (!this.validateActions(rule.actions)) {
          this.logger.error(`Rule ${rule.id} has invalid actions, skipping`);
          continue;
        }

        // Execute all actions
        const actions = rule.actions as WorkflowAction[];
        const executedActions = [];

        for (const action of actions) {
          try {
            const result = await this.actionService.executeAction(
              action,
              eventData,
            );
            executedActions.push({ action, result });
          } catch (error) {
            const errorMessage =
              error instanceof Error
                ? error.stack || error.message
                : String(error);
            this.logger.error(
              `Error executing action ${action.type}:`,
              errorMessage,
            );
            executedActions.push({
              action,
              error: error instanceof Error ? error.message : String(error),
            });
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
        const errorMessage =
          error instanceof Error
            ? error.stack || error.message
            : String(error);
        this.logger.error(
          `Error processing rule ${rule.id}:`,
          errorMessage,
        );
      }
    }
  }

  /**
   * Evaluate if conditions match event data
   */
  private evaluateConditions(
    conditions: WorkflowConditions,
    eventData: Record<string, any>,
  ): boolean {
    for (const [key, value] of Object.entries(conditions)) {
      if (eventData[key] !== value) {
        return false;
      }
    }
    return true;
  }

  /**
   * Validate trigger structure from database
   */
  private validateTrigger(trigger: unknown): trigger is WorkflowTrigger {
    return (
      typeof trigger === 'object' &&
      trigger !== null &&
      'event' in trigger &&
      typeof (trigger as any).event === 'string'
    );
  }

  /**
   * Validate conditions structure from database
   */
  private validateConditions(conditions: unknown): conditions is WorkflowConditions {
    return typeof conditions === 'object' && conditions !== null;
  }

  /**
   * Validate actions structure from database
   */
  private validateActions(actions: unknown): actions is WorkflowAction[] {
    return (
      Array.isArray(actions) &&
      actions.every(
        (action) =>
          typeof action === 'object' && action !== null && 'type' in action,
      )
    );
  }
}
