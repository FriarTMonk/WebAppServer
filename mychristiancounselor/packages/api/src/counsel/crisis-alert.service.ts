import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { EmailTemplatesService } from '../email/email-templates.service';
import { CrisisDetectedEvent, EVENT_TYPES } from '../events/event-types';

/**
 * Crisis Alert Service
 *
 * Handles crisis alert logic:
 * - Check for assigned counselor
 * - Throttle alerts (1 per hour per member)
 * - Send high-priority email to counselor
 * - Log all detections (with or without email)
 */
@Injectable()
export class CrisisAlertService {
  private readonly logger = new Logger(CrisisAlertService.name);
  private readonly THROTTLE_WINDOW_HOURS = 1;

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private emailTemplates: EmailTemplatesService,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Listen for crisis detected events
   */
  @OnEvent(EVENT_TYPES.CRISIS_DETECTED)
  async handleCrisisDetected(event: CrisisDetectedEvent): Promise<void> {
    this.logger.warn(
      `Crisis detected for member ${event.memberId}: ${event.crisisType} ` +
      `(${event.confidence} confidence, ${event.detectionMethod} method)`
    );

    try {
      // 1. Check for assigned counselor
      const assignment = await this.prisma.counselorAssignment.findFirst({
        where: {
          memberId: event.memberId,
          status: 'active',
        },
        select: {
          counselorId: true,
        },
      });

      if (!assignment) {
        this.logger.log(`No counselor assigned to member ${event.memberId}, logging only`);
        await this.logCrisisAlert(event, null, false, false, null);
        return;
      }

      // 2. Check throttling (prevent alert fatigue)
      const shouldThrottle = await this.checkThrottling(event.memberId);
      if (shouldThrottle) {
        this.logger.log(`Throttling crisis alert for member ${event.memberId}`);
        await this.logCrisisAlert(
          event,
          assignment.counselorId,
          false,
          true,
          'Previous alert sent within throttle window (1 hour)'
        );
        return;
      }

      // 3. Send high-priority email to counselor
      const emailLogId = await this.sendCrisisAlertEmail(event, assignment.counselorId);

      // 4. Log crisis alert with email sent
      await this.logCrisisAlert(event, assignment.counselorId, true, false, null, emailLogId);

      this.logger.log(`Crisis alert email sent to counselor ${assignment.counselorId}`);
    } catch (error) {
      this.logger.error(`Failed to handle crisis alert for member ${event.memberId}`, error);
      // Log failed attempt
      await this.logCrisisAlert(event, null, false, false, `Error: ${error.message}`);
    }
  }

  /**
   * Check if alert should be throttled (1 hour window)
   */
  private async checkThrottling(memberId: string): Promise<boolean> {
    const throttleWindow = new Date();
    throttleWindow.setHours(throttleWindow.getHours() - this.THROTTLE_WINDOW_HOURS);

    const recentAlert = await this.prisma.crisisAlertLog.findFirst({
      where: {
        memberId,
        emailSent: true,
        createdAt: {
          gte: throttleWindow,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return !!recentAlert;
  }

  /**
   * Send crisis alert email to counselor
   */
  private async sendCrisisAlertEmail(
    event: CrisisDetectedEvent,
    counselorId: string
  ): Promise<string | null> {
    // Get counselor and member details
    const [counselor, member] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: counselorId },
        select: { firstName: true, lastName: true, email: true },
      }),
      this.prisma.user.findUnique({
        where: { id: event.memberId },
        select: { firstName: true, lastName: true, email: true },
      }),
    ]);

    if (!counselor || !member) {
      throw new Error('Counselor or member not found');
    }

    const webAppUrl = this.configService.get('WEB_APP_URL', 'http://localhost:3699');
    const conversationUrl = event.messageId
      ? `${webAppUrl}/counsel/member/${event.memberId}/journal` // Link to journal where they can see messages
      : `${webAppUrl}/counsel/member/${event.memberId}/journal`;
    const memberProfileUrl = `${webAppUrl}/counsel/member/${event.memberId}/observations`;

    // Render email template
    const emailTemplate = this.emailTemplates.renderCrisisAlertEmail({
      appName: 'MyChristianCounselor',
      appUrl: webAppUrl,
      supportEmail: this.configService.get('SUPPORT_EMAIL', 'support@mychristiancounselor.com'),
      currentYear: new Date().getFullYear(),
      counselorName: counselor.firstName || 'Counselor',
      memberName: `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Member',
      memberEmail: member.email,
      crisisType: event.crisisType,
      confidence: event.confidence,
      detectionMethod: event.detectionMethod,
      triggeringMessage: event.triggeringMessage,
      conversationUrl,
      memberProfileUrl,
    });

    // Send high-priority email
    const result = await this.emailService.sendEmail({
      to: counselor.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text,
      emailType: 'crisis_alert',
      userId: counselorId,
      tag: 'crisis',
      priority: 1, // X-Priority header for high priority
      metadata: {
        memberId: event.memberId,
        crisisType: event.crisisType,
        confidence: event.confidence,
      },
    });

    if (!result.success) {
      throw new Error(`Failed to send crisis alert email: ${result.error}`);
    }

    return result.emailLogId || null;
  }

  /**
   * Log crisis alert to database
   */
  private async logCrisisAlert(
    event: CrisisDetectedEvent,
    counselorId: string | null,
    emailSent: boolean,
    throttled: boolean,
    throttleReason: string | null,
    emailLogId?: string | null
  ): Promise<void> {
    await this.prisma.crisisAlertLog.create({
      data: {
        memberId: event.memberId,
        counselorId,
        crisisType: event.crisisType,
        confidence: event.confidence,
        detectionMethod: event.detectionMethod,
        triggeringMessage: event.triggeringMessage,
        messageId: event.messageId,
        emailSent,
        throttled,
        throttleReason,
        emailLogId,
      },
    });
  }
}
