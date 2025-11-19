import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './email.service';

/**
 * Billing Cron Service
 * Handles automated billing reminders for organization subscriptions
 *
 * Schedule:
 * - Runs daily at 9 AM UTC
 * - Checks all active organization contracts
 * - Sends appropriate emails based on days until renewal
 */
@Injectable()
export class BillingCronService {
  private readonly logger = new Logger(BillingCronService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  /**
   * Daily billing check cron job
   * Runs every day at 9:00 AM UTC
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async handleDailyBillingCheck(): Promise<void> {
    this.logger.log('Starting daily billing check...');

    try {
      // Get all active organization contracts
      const contracts = await this.prisma.organizationContract.findMany({
        where: {
          status: 'active',
        },
        include: {
          organization: {
            include: {
              members: {
                where: {
                  role: {
                    name: {
                      contains: 'Admin',
                    },
                  },
                },
                include: {
                  user: {
                    select: {
                      id: true,
                      email: true,
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      this.logger.log(`Found ${contracts.length} active organization contracts`);

      // Process each contract
      for (const contract of contracts) {
        await this.processContract(contract);
      }

      this.logger.log('Daily billing check completed');
    } catch (error) {
      this.logger.error('Error in daily billing check:', error);
    }
  }

  /**
   * Process a single contract and send appropriate notifications
   */
  private async processContract(contract: any): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const renewalDate = new Date(contract.renewalDate);
    renewalDate.setHours(0, 0, 0, 0);

    // Calculate days until renewal (negative = past due)
    const daysUntilRenewal = Math.ceil(
      (renewalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    this.logger.debug(
      `Contract ${contract.id} (${contract.organization.name}): ${daysUntilRenewal} days until renewal`
    );

    // Get organization admins to notify
    const admins = contract.organization.members.filter((member: any) =>
      member.role?.name?.includes('Admin')
    );

    if (admins.length === 0) {
      this.logger.warn(
        `No admins found for organization ${contract.organization.name} (${contract.organizationId})`
      );
      return;
    }

    // Determine which notification to send based on days until renewal
    if (daysUntilRenewal === 90) {
      await this.send90DayReminder(contract, admins);
    } else if (daysUntilRenewal === 30) {
      await this.send30DayInvoice(contract, admins);
    } else if (daysUntilRenewal === 0) {
      await this.sendSuspensionNotice(contract, admins);
    } else if (daysUntilRenewal === -10) {
      await this.suspendAccount(contract, admins);
    }
  }

  /**
   * Send 90-day renewal reminder
   */
  private async send90DayReminder(contract: any, admins: any[]): Promise<void> {
    this.logger.log(`Sending 90-day reminder for ${contract.organization.name}`);

    for (const admin of admins) {
      try {
        await this.emailService.sendBillingEmail(
          admin.user.email,
          {
            recipientName: admin.user.firstName || admin.user.email,
            emailSubType: 'org_90day_reminder',
            amount: contract.value,
            currency: 'USD',
            organizationName: contract.organization.name,
            renewalDate: contract.renewalDate,
          },
          admin.user.id
        );
      } catch (error) {
        this.logger.error(
          `Failed to send 90-day reminder to ${admin.user.email}:`,
          error
        );
      }
    }

    // Update contract metadata to track email sent
    await this.updateContractMetadata(contract.id, {
      reminder90DaySent: true,
      reminder90DaySentAt: new Date().toISOString(),
    });
  }

  /**
   * Send 30-day invoice
   */
  private async send30DayInvoice(contract: any, admins: any[]): Promise<void> {
    this.logger.log(`Sending 30-day invoice for ${contract.organization.name}`);

    for (const admin of admins) {
      try {
        await this.emailService.sendBillingEmail(
          admin.user.email,
          {
            recipientName: admin.user.firstName || admin.user.email,
            emailSubType: 'org_30day_invoice',
            amount: contract.value,
            currency: 'USD',
            organizationName: contract.organization.name,
            renewalDate: contract.renewalDate,
            invoiceUrl: contract.notes?.includes('http')
              ? contract.notes
              : undefined,
          },
          admin.user.id
        );
      } catch (error) {
        this.logger.error(
          `Failed to send 30-day invoice to ${admin.user.email}:`,
          error
        );
      }
    }

    // Update contract metadata to track email sent
    await this.updateContractMetadata(contract.id, {
      invoice30DaySent: true,
      invoice30DaySentAt: new Date().toISOString(),
    });
  }

  /**
   * Send suspension notice (payment overdue)
   */
  private async sendSuspensionNotice(contract: any, admins: any[]): Promise<void> {
    this.logger.warn(
      `Sending suspension notice for ${contract.organization.name} - payment overdue`
    );

    for (const admin of admins) {
      try {
        await this.emailService.sendBillingEmail(
          admin.user.email,
          {
            recipientName: admin.user.firstName || admin.user.email,
            emailSubType: 'org_suspension_notice',
            amount: contract.value,
            currency: 'USD',
            organizationName: contract.organization.name,
            renewalDate: contract.renewalDate,
            gracePeriodDays: 10,
          },
          admin.user.id
        );
      } catch (error) {
        this.logger.error(
          `Failed to send suspension notice to ${admin.user.email}:`,
          error
        );
      }
    }

    // Update contract status to overdue
    await this.prisma.organizationContract.update({
      where: { id: contract.id },
      data: {
        status: 'overdue',
      },
    });

    // Update contract metadata to track email sent
    await this.updateContractMetadata(contract.id, {
      suspensionNoticeSent: true,
      suspensionNoticeSentAt: new Date().toISOString(),
    });
  }

  /**
   * Suspend account and send suspension notification
   */
  private async suspendAccount(contract: any, admins: any[]): Promise<void> {
    this.logger.error(
      `Suspending account for ${contract.organization.name} - 10 days past due`
    );

    // Send suspension emails
    for (const admin of admins) {
      try {
        await this.emailService.sendBillingEmail(
          admin.user.email,
          {
            recipientName: admin.user.firstName || admin.user.email,
            emailSubType: 'org_suspended',
            amount: contract.value,
            currency: 'USD',
            organizationName: contract.organization.name,
            renewalDate: contract.renewalDate,
          },
          admin.user.id
        );
      } catch (error) {
        this.logger.error(
          `Failed to send suspension email to ${admin.user.email}:`,
          error
        );
      }
    }

    // Update contract status to suspended
    await this.prisma.organizationContract.update({
      where: { id: contract.id },
      data: {
        status: 'suspended',
        endDate: new Date(),
      },
    });

    // Update contract metadata to track suspension
    await this.updateContractMetadata(contract.id, {
      accountSuspended: true,
      accountSuspendedAt: new Date().toISOString(),
    });
  }

  /**
   * Update contract metadata (stored in notes field as JSON)
   * This is a helper to track which emails have been sent
   */
  private async updateContractMetadata(
    contractId: string,
    metadata: Record<string, any>
  ): Promise<void> {
    const contract = await this.prisma.organizationContract.findUnique({
      where: { id: contractId },
      select: { notes: true },
    });

    let existingMetadata = {};
    if (contract?.notes) {
      try {
        existingMetadata = JSON.parse(contract.notes);
      } catch {
        // Notes is not JSON, keep as is
      }
    }

    const updatedMetadata = {
      ...existingMetadata,
      ...metadata,
    };

    await this.prisma.organizationContract.update({
      where: { id: contractId },
      data: {
        notes: JSON.stringify(updatedMetadata),
      },
    });
  }
}
