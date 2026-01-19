import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { EVENT_TYPES, BookEvaluationCompletedEvent } from '../events/event-types';

@Injectable()
export class BookEvaluationNotificationService {
  private readonly logger = new Logger(BookEvaluationNotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  @OnEvent(EVENT_TYPES.BOOK_EVALUATION_COMPLETED)
  async handleBookEvaluationCompleted(event: BookEvaluationCompletedEvent): Promise<void> {
    try {
      this.logger.log(`Handling book evaluation completed event for book ${event.bookId}`);

      // Fetch user details
      const user = await this.prisma.user.findUnique({
        where: { id: event.createdBy },
        select: { email: true, name: true },
      });

      if (!user) {
        this.logger.warn(`User ${event.createdBy} not found for book evaluation notification`);
        return;
      }

      // Send notification email
      await this.emailService.sendBookEvaluationCompleteEmail(
        user.email,
        {
          userName: user.name,
          bookTitle: event.title,
          bookAuthor: event.author,
          bookId: event.bookId,
          theologicalScore: event.theologicalScore,
          overallAlignment: event.overallAlignment,
        },
      );

      this.logger.log(`Sent book evaluation notification to ${user.email}`);
    } catch (error) {
      this.logger.error(`Failed to send book evaluation notification for book ${event.bookId}:`, error);
      // Don't throw - notification failures shouldn't break evaluation
    }
  }
}
