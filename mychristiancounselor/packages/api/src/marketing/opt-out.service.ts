import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Opt-Out Detection Service
 *
 * Handles email opt-out requests from marketing campaigns:
 * 1. Detects opt-out language in email replies
 * 2. Marks individual ProspectContact as opted out
 * 3. Cascades to mark entire Prospect if all contacts opted out
 */
@Injectable()
export class OptOutService {
  private readonly logger = new Logger(OptOutService.name);

  // Common opt-out phrases (case-insensitive)
  private readonly OPT_OUT_PATTERNS = [
    /unsubscribe/i,
    /opt[- ]?out/i,
    /remove me/i,
    /take me off/i,
    /stop sending/i,
    /no longer interested/i,
    /don'?t contact/i,
    /do not contact/i,
    /stop emailing/i,
    /remove from (your )?list/i,
    /opt out/i,
  ];

  constructor(private prisma: PrismaService) {}

  /**
   * Check if email content contains opt-out language
   */
  isOptOutRequest(emailContent: string): boolean {
    if (!emailContent || emailContent.trim().length === 0) {
      return false;
    }

    const normalizedContent = emailContent.toLowerCase().trim();

    // Check against all opt-out patterns
    return this.OPT_OUT_PATTERNS.some(pattern => pattern.test(normalizedContent));
  }

  /**
   * Process opt-out request for a prospect contact
   *
   * @param email - Email address requesting opt-out
   * @returns Object with success status and details
   */
  async processOptOut(email: string): Promise<{
    success: boolean;
    contactOptedOut: boolean;
    prospectOptedOut: boolean;
    contactId?: string;
    prospectId?: string;
    message: string;
  }> {
    try {
      this.logger.log(`Processing opt-out request for email: ${email}`);

      // Find the prospect contact by email
      const contact = await this.prisma.prospectContact.findFirst({
        where: {
          email: email.toLowerCase().trim(),
          optOut: false, // Only process if not already opted out
        },
        include: {
          prospect: {
            include: {
              contacts: true, // Get all contacts to check if all opted out
            },
          },
        },
      });

      if (!contact) {
        this.logger.warn(`No active contact found for email: ${email}`);
        return {
          success: false,
          contactOptedOut: false,
          prospectOptedOut: false,
          message: 'Contact not found or already opted out',
        };
      }

      // Mark the contact as opted out
      await this.prisma.prospectContact.update({
        where: { id: contact.id },
        data: {
          optOut: true,
          optOutAt: new Date(),
        },
      });

      this.logger.log(`Marked contact ${contact.id} (${email}) as opted out`);

      // Check if all contacts in the prospect are now opted out
      const allContactsOptedOut = contact.prospect.contacts.every(
        c => c.id === contact.id || c.optOut
      );

      let prospectOptedOut = false;

      if (allContactsOptedOut) {
        // Mark the entire prospect as opted out
        await this.prisma.prospect.update({
          where: { id: contact.prospectId },
          data: {
            optOut: true,
            optOutAt: new Date(),
          },
        });

        prospectOptedOut = true;
        this.logger.log(
          `All contacts opted out - marked prospect ${contact.prospectId} (${contact.prospect.organizationName}) as opted out`
        );
      }

      return {
        success: true,
        contactOptedOut: true,
        prospectOptedOut,
        contactId: contact.id,
        prospectId: contact.prospectId,
        message: prospectOptedOut
          ? `Contact and entire organization (${contact.prospect.organizationName}) marked as opted out`
          : `Contact marked as opted out`,
      };
    } catch (error) {
      this.logger.error(`Failed to process opt-out for ${email}:`, error);
      return {
        success: false,
        contactOptedOut: false,
        prospectOptedOut: false,
        message: `Error processing opt-out: ${error.message}`,
      };
    }
  }

  /**
   * Get opt-out statistics
   */
  async getOptOutStats(): Promise<{
    totalContacts: number;
    optedOutContacts: number;
    optOutContactRate: number;
    totalProspects: number;
    optedOutProspects: number;
    optOutProspectRate: number;
  }> {
    const [
      totalContacts,
      optedOutContacts,
      totalProspects,
      optedOutProspects,
    ] = await Promise.all([
      this.prisma.prospectContact.count(),
      this.prisma.prospectContact.count({ where: { optOut: true } }),
      this.prisma.prospect.count(),
      this.prisma.prospect.count({ where: { optOut: true } }),
    ]);

    return {
      totalContacts,
      optedOutContacts,
      optOutContactRate: totalContacts > 0 ? optedOutContacts / totalContacts : 0,
      totalProspects,
      optedOutProspects,
      optOutProspectRate: totalProspects > 0 ? optedOutProspects / totalProspects : 0,
    };
  }
}
