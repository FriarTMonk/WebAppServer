import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CounselingAiService } from '../ai/counseling-ai.service';
import { MemberTaskService } from './member-task.service';
import { OnEvent } from '@nestjs/event-emitter';
import { SessionCompletedEvent } from '../events/event-types';
import { Message } from '@prisma/client';

interface TaskMetadata {
  keywords?: string[];
  [key: string]: any;
}

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
    try {
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
        this.logger.log(
          `No pending conversation prompts for member ${memberId}`,
        );
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
        const metadata = task.metadata as TaskMetadata;
        const keywords = metadata?.keywords || [];
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
    } catch (error) {
      this.logger.error(
        `Error checking conversation topic completion for member ${memberId}: ${error.message}`,
        error.stack,
      );
      throw error;
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

      // Get session with messages relation
      const session = await this.prisma.session.findUnique({
        where: { id: event.sessionId },
        include: {
          messages: {
            orderBy: { timestamp: 'asc' },
          },
        },
      });

      if (!session) {
        this.logger.warn(`Session ${event.sessionId} not found`);
        return;
      }

      // Extract user messages from the messages relation
      const conversationText = session.messages
        .filter((msg: Message) => msg.role === 'user')
        .map((msg: Message) => msg.content)
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
        error.stack,
      );
    }
  }
}
