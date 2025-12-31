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
