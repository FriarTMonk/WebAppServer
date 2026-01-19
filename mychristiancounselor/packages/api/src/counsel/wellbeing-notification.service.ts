import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { EVENT_TYPES, WellbeingStatusChangedEvent } from '../events/event-types';

@Injectable()
export class WellbeingNotificationService {
  private readonly logger = new Logger(WellbeingNotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  @OnEvent(EVENT_TYPES.WELLBEING_STATUS_CHANGED)
  async handleWellbeingStatusChanged(event: WellbeingStatusChangedEvent): Promise<void> {
    try {
      // Only notify if significant change
      if (!event.triggerNotification) {
        this.logger.debug(`Skipping notification for minor wellbeing change: ${event.previousStatus} -> ${event.newStatus}`);
        return;
      }

      this.logger.log(`Handling wellbeing status changed event for member ${event.memberId}: ${event.previousStatus} -> ${event.newStatus}`);

      // Fetch client details
      const client = await this.prisma.user.findUnique({
        where: { id: event.memberId },
        select: { name: true, email: true },
      });

      if (!client) {
        this.logger.warn(`Member ${event.memberId} not found for wellbeing notification`);
        return;
      }

      // Fetch counselors
      if (event.counselorIds.length === 0) {
        this.logger.debug(`No counselors assigned to member ${event.memberId}, skipping notification`);
        return;
      }

      const counselors = await this.prisma.user.findMany({
        where: {
          id: { in: event.counselorIds },
          userType: 'counselor',
        },
        select: { email: true, name: true },
      });

      // Send notification to each counselor
      for (const counselor of counselors) {
        await this.emailService.sendWellbeingStatusChangedEmail(
          counselor.email,
          {
            counselorName: counselor.name,
            clientName: client.name || client.email,
            memberId: event.memberId,
            oldStatus: event.previousStatus,
            newStatus: event.newStatus,
            timestamp: event.timestamp,
          },
        );

        this.logger.log(`Sent wellbeing notification to counselor ${counselor.email}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send wellbeing notification for member ${event.memberId}:`, error);
      // Don't throw - notification failures shouldn't break wellbeing analysis
    }
  }
}
