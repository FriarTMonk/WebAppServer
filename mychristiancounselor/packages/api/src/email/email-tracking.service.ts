import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Service for tracking email delivery and engagement metrics
 * Logs all email activity to the EmailLog table
 */
@Injectable()
export class EmailTrackingService {
  constructor(private prisma: PrismaService) {}

  /**
   * Log an email that was sent
   */
  async logEmailSent(data: {
    userId?: string;
    recipientEmail: string;
    emailType: string;
    postmarkId?: string;
    metadata?: Record<string, any>;
  }): Promise<string> {
    const emailLog = await this.prisma.emailLog.create({
      data: {
        userId: data.userId,
        recipientEmail: data.recipientEmail.toLowerCase(),
        emailType: data.emailType,
        postmarkId: data.postmarkId,
        status: 'sent',
        metadata: data.metadata || {},
        sentAt: new Date(),
      },
    });

    return emailLog.id;
  }

  /**
   * Update email status to delivered (from Postmark webhook)
   */
  async markAsDelivered(postmarkId: string): Promise<void> {
    const deliveredAt = new Date();

    await this.prisma.emailLog.updateMany({
      where: { postmarkId },
      data: {
        status: 'delivered',
        deliveredAt,
      },
    });

    // Sync to EmailCampaignRecipient if linked
    await this.syncToCampaignRecipient(postmarkId, { deliveredAt });
  }

  /**
   * Update email status to bounced (from Postmark webhook)
   */
  async markAsBounced(postmarkId: string, bounceReason: string): Promise<void> {
    const bouncedAt = new Date();

    await this.prisma.emailLog.updateMany({
      where: { postmarkId },
      data: {
        status: 'bounced',
        bounceReason,
        bouncedAt,
      },
    });

    // Sync to EmailCampaignRecipient if linked
    await this.syncToCampaignRecipient(postmarkId, { bouncedAt, bounceReason });
  }

  /**
   * Mark email as opened (from Postmark webhook)
   */
  async markAsOpened(postmarkId: string): Promise<void> {
    const openedAt = new Date();

    await this.prisma.emailLog.updateMany({
      where: { postmarkId },
      data: {
        status: 'opened', // Only update if not already a more advanced status
        openedAt,
      },
    });

    // Sync to EmailCampaignRecipient if linked
    await this.syncToCampaignRecipient(postmarkId, { openedAt });
  }

  /**
   * Mark email as clicked (from Postmark webhook)
   */
  async markAsClicked(postmarkId: string): Promise<void> {
    const clickedAt = new Date();

    await this.prisma.emailLog.updateMany({
      where: { postmarkId },
      data: {
        clickedAt,
      },
    });

    // Sync to EmailCampaignRecipient if linked
    await this.syncToCampaignRecipient(postmarkId, { clickedAt });
  }

  /**
   * Mark email as failed (when send attempt fails)
   */
  async markAsFailed(data: {
    userId?: string;
    recipientEmail: string;
    emailType: string;
    bounceReason: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    await this.prisma.emailLog.create({
      data: {
        userId: data.userId,
        recipientEmail: data.recipientEmail.toLowerCase(),
        emailType: data.emailType,
        status: 'failed',
        bounceReason: data.bounceReason,
        metadata: data.metadata || {},
        sentAt: new Date(),
        bouncedAt: new Date(),
      },
    });
  }

  /**
   * Get email history for a user
   */
  async getEmailHistory(userId: string, limit = 50) {
    return this.prisma.emailLog.findMany({
      where: { userId },
      orderBy: { sentAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get email history by recipient email
   */
  async getEmailHistoryByEmail(email: string, limit = 50) {
    return this.prisma.emailLog.findMany({
      where: { recipientEmail: email.toLowerCase() },
      orderBy: { sentAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Check how many emails bounced for a given email address
   */
  async getBouncedCount(email: string, daysAgo = 30): Promise<number> {
    const since = new Date();
    since.setDate(since.getDate() - daysAgo);

    return this.prisma.emailLog.count({
      where: {
        recipientEmail: email.toLowerCase(),
        status: 'bounced',
        sentAt: { gte: since },
      },
    });
  }

  /**
   * Check if email address should be flagged as undeliverable
   * (3 or more bounces in last 30 days)
   */
  async isEmailUndeliverable(email: string): Promise<boolean> {
    const bouncedCount = await this.getBouncedCount(email, 30);
    return bouncedCount >= 3;
  }

  /**
   * Get email delivery statistics for admin dashboard
   */
  async getDeliveryStats(daysAgo = 30) {
    const since = new Date();
    since.setDate(since.getDate() - daysAgo);

    const [totalSent, totalDelivered, totalBounced, totalOpened] = await Promise.all([
      this.prisma.emailLog.count({
        where: { sentAt: { gte: since } },
      }),
      this.prisma.emailLog.count({
        where: {
          sentAt: { gte: since },
          status: 'delivered',
        },
      }),
      this.prisma.emailLog.count({
        where: {
          sentAt: { gte: since },
          status: 'bounced',
        },
      }),
      this.prisma.emailLog.count({
        where: {
          sentAt: { gte: since },
          status: 'opened',
        },
      }),
    ]);

    const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;
    const bounceRate = totalSent > 0 ? (totalBounced / totalSent) * 100 : 0;
    const openRate = totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0;

    return {
      totalSent,
      totalDelivered,
      totalBounced,
      totalOpened,
      deliveryRate: Math.round(deliveryRate * 10) / 10,
      bounceRate: Math.round(bounceRate * 10) / 10,
      openRate: Math.round(openRate * 10) / 10,
    };
  }

  /**
   * Get top bouncing email addresses for admin review
   */
  async getTopBouncingEmails(limit = 10, daysAgo = 30) {
    const since = new Date();
    since.setDate(since.getDate() - daysAgo);

    // Raw query to group by email and count bounces
    const results = await this.prisma.$queryRaw<
      Array<{ recipientEmail: string; bounceCount: number }>
    >`
      SELECT "recipientEmail", COUNT(*)::int as "bounceCount"
      FROM "EmailLog"
      WHERE status = 'bounced'
        AND "sentAt" >= ${since}
      GROUP BY "recipientEmail"
      ORDER BY "bounceCount" DESC
      LIMIT ${limit}
    `;

    return results;
  }

  /**
   * Sync tracking data from EmailLog to EmailCampaignRecipient
   * This ensures campaign analytics show accurate metrics
   */
  private async syncToCampaignRecipient(
    postmarkId: string,
    data: {
      deliveredAt?: Date;
      openedAt?: Date;
      clickedAt?: Date;
      bouncedAt?: Date;
      bounceReason?: string;
    },
  ): Promise<void> {
    // Find the EmailLog by postmarkId
    const emailLog = await this.prisma.emailLog.findFirst({
      where: { postmarkId },
    });

    if (!emailLog) {
      return; // No EmailLog found, nothing to sync
    }

    // Find the EmailCampaignRecipient linked to this EmailLog
    const recipient = await this.prisma.emailCampaignRecipient.findFirst({
      where: { emailLogId: emailLog.id },
    });

    if (!recipient) {
      return; // Not linked to a campaign, nothing to sync
    }

    // Update the EmailCampaignRecipient with the tracking data
    await this.prisma.emailCampaignRecipient.update({
      where: { id: recipient.id },
      data,
    });
  }
}
