import { Controller, Post, Body, UseGuards, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { TrackConversionDto } from './dto/track-conversion.dto';

@Controller('marketing/conversions')
@UseGuards(JwtAuthGuard)
export class ConversionController {
  private readonly logger = new Logger(ConversionController.name);

  constructor(private prisma: PrismaService) {}

  @Post('track')
  async trackConversion(@Body() dto: TrackConversionDto) {
    this.logger.log(`Tracking conversion: ${dto.conversionType} for ${dto.prospectEmail}`);

    // Find the prospect contact by email
    const prospectContact = await this.prisma.prospectContact.findFirst({
      where: { email: dto.prospectEmail },
    });

    if (!prospectContact) {
      this.logger.warn(`Prospect contact not found for conversion tracking: ${dto.prospectEmail}`);
      return { success: false, message: 'Prospect contact not found' };
    }

    // Find the most recent EmailCampaignRecipient for this prospect contact that hasn't been converted yet
    const recipient = await this.prisma.emailCampaignRecipient.findFirst({
      where: {
        prospectContactId: prospectContact.id,
        convertedAt: null,
      },
      orderBy: { sentAt: 'desc' },
    });

    if (!recipient) {
      this.logger.warn(`No campaign recipient found for conversion tracking: ${dto.prospectEmail}`);
      return { success: false, message: 'No campaign found for this prospect contact' };
    }

    // Update the recipient with conversion data
    await this.prisma.emailCampaignRecipient.update({
      where: { id: recipient.id },
      data: {
        convertedAt: new Date(),
        conversionType: dto.conversionType,
      },
    });

    this.logger.log(`Conversion tracked: ${dto.conversionType} for recipient ${recipient.id}`);

    return {
      success: true,
      message: 'Conversion tracked successfully',
      campaignId: recipient.campaignId,
      prospectId: prospectContact.prospectId,
      prospectContactId: prospectContact.id,
    };
  }
}
