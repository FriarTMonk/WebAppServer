import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { SlaCalculatorService } from './sla-calculator.service';

@Injectable()
export class SlaScheduler {
  private readonly logger = new Logger(SlaScheduler.name);

  constructor(
    private prisma: PrismaService,
    private slaCalculator: SlaCalculatorService,
  ) {}

  /**
   * Update SLA statuses for all active tickets
   * Runs every 15 minutes
   */
  @Cron('*/15 * * * *', {
    name: 'slaStatusUpdater',
    timeZone: 'America/New_York',
  })
  async updateSLAStatuses() {
    this.logger.log('Starting SLA status update job...');

    try {
      // Fetch all active tickets
      const activeTickets = await this.prisma.supportTicket.findMany({
        where: {
          status: { in: ['open', 'in_progress', 'waiting_on_user'] },
        },
        select: {
          id: true,
          createdAt: true,
          responseSLADeadline: true,
          resolutionSLADeadline: true,
          responseSLAStatus: true,
          resolutionSLAStatus: true,
          slaPausedAt: true,
        },
      });

      let updatedCount = 0;
      let notificationCount = 0;

      for (const ticket of activeTickets) {
        try {
          // Calculate pause duration if paused
          const pausedMinutes = ticket.slaPausedAt
            ? await this.slaCalculator.calculateBusinessMinutes(
                ticket.slaPausedAt,
                new Date(),
              )
            : 0;

          // Calculate current response SLA status
          const newResponseStatus = await this.slaCalculator.calculateSLAStatus(
            ticket.createdAt,
            ticket.responseSLADeadline,
            pausedMinutes,
          );

          // Calculate current resolution SLA status
          const newResolutionStatus = await this.slaCalculator.calculateSLAStatus(
            ticket.createdAt,
            ticket.resolutionSLADeadline,
            pausedMinutes,
          );

          // Check if status changed
          const responseChanged =
            newResponseStatus !== ticket.responseSLAStatus;
          const resolutionChanged =
            newResolutionStatus !== ticket.resolutionSLAStatus;

          if (responseChanged || resolutionChanged) {
            // Update database
            await this.prisma.supportTicket.update({
              where: { id: ticket.id },
              data: {
                responseSLAStatus: newResponseStatus,
                resolutionSLAStatus: newResolutionStatus,
              },
            });

            updatedCount++;

            // Send notification if entering critical or breached state
            if (
              this.shouldNotify(
                ticket.responseSLAStatus,
                newResponseStatus,
              ) ||
              this.shouldNotify(
                ticket.resolutionSLAStatus,
                newResolutionStatus,
              )
            ) {
              await this.sendSLANotification(
                ticket,
                newResponseStatus,
                newResolutionStatus,
              );
              notificationCount++;
            }
          }
        } catch (error) {
          this.logger.error(
            `Failed to update SLA for ticket ${ticket.id}`,
            error.stack,
          );
        }
      }

      this.logger.log(
        `SLA status update complete: ${updatedCount} tickets updated, ${notificationCount} notifications sent`,
      );
    } catch (error) {
      this.logger.error('SLA status update job failed', error.stack);
    }
  }

  /**
   * Determine if a notification should be sent
   */
  private shouldNotify(oldStatus: string, newStatus: string): boolean {
    // Notify when entering critical or breached state
    return (
      (newStatus === 'critical' || newStatus === 'breached') &&
      oldStatus !== newStatus
    );
  }

  /**
   * Send SLA notification to assigned admin or all platform admins
   */
  private async sendSLANotification(
    ticket: any,
    responseSLAStatus: string,
    resolutionSLAStatus: string,
  ) {
    const ticketDetails = await this.prisma.supportTicket.findUnique({
      where: { id: ticket.id },
      select: {
        id: true,
        title: true,
        assignedToId: true,
        responseSLADeadline: true,
        resolutionSLADeadline: true,
      },
    });

    // Determine which SLA is most urgent
    const mostUrgentSLA =
      responseSLAStatus === 'breached' ||
      (responseSLAStatus === 'critical' &&
        resolutionSLAStatus !== 'breached')
        ? 'response'
        : 'resolution';

    const deadline =
      mostUrgentSLA === 'response'
        ? ticketDetails.responseSLADeadline
        : ticketDetails.resolutionSLADeadline;

    const statusLabel =
      responseSLAStatus === 'breached' || resolutionSLAStatus === 'breached'
        ? 'Breached'
        : 'Critical';

    // Calculate time remaining
    const minutesRemaining = await this.slaCalculator.calculateBusinessMinutes(
      new Date(),
      deadline,
    );

    const timeText =
      minutesRemaining > 0
        ? `due in ${this.formatMinutes(minutesRemaining)}`
        : `overdue by ${this.formatMinutes(Math.abs(minutesRemaining))}`;

    // Determine recipient (assigned admin or all platform admins)
    let recipientIds: string[] = [];
    if (ticketDetails.assignedToId) {
      recipientIds = [ticketDetails.assignedToId];
    } else {
      const platformAdmins = await this.prisma.user.findMany({
        where: { isPlatformAdmin: true },
        select: { id: true },
      });
      recipientIds = platformAdmins.map((admin) => admin.id);
    }

    // Create notifications
    for (const recipientId of recipientIds) {
      await this.prisma.notification.create({
        data: {
          recipientId,
          senderId: null,
          category: 'sla_warning',
          title: `SLA ${statusLabel}`,
          message: `Ticket #${ticketDetails.id.substring(0, 8)}: "${ticketDetails.title}" - ${mostUrgentSLA === 'response' ? 'Response' : 'Resolution'} SLA ${timeText}`,
          linkTo: `/support/tickets/${ticketDetails.id}`,
        },
      });
    }

    this.logger.log(
      `SLA notification sent for ticket ${ticket.id} to ${recipientIds.length} recipient(s)`,
    );
  }

  /**
   * Format minutes into human-readable time
   */
  private formatMinutes(minutes: number): string {
    if (minutes < 60) {
      return `${minutes}m`;
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}h ${mins}m`;
    } else {
      const days = Math.floor(minutes / 1440);
      const hours = Math.floor((minutes % 1440) / 60);
      return `${days}d ${hours}h`;
    }
  }
}
