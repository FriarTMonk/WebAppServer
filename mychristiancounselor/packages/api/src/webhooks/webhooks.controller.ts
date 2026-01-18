import { Controller, Post, Body, HttpCode, Logger } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/decorators/public.decorator';
import { WebhooksService } from './webhooks.service';
import { PostmarkInboundDto } from './dto/postmark-inbound.dto';
import { PostmarkTrackingWebhookDto } from './dto/postmark-tracking.dto';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly webhooksService: WebhooksService) {}

  @Public()
  @Post('postmark/inbound')
  @HttpCode(200)
  @Throttle({ webhook: { limit: 50, ttl: 60000 } }) // Use webhook rate limit profile
  async handlePostmarkInbound(@Body() emailData: PostmarkInboundDto) {
    this.logger.log(`Received Postmark inbound webhook from ${emailData.FromFull.Email}`);

    try {
      const result = await this.webhooksService.handleInboundEmail(emailData);

      this.logger.log(`Successfully processed email, created ticket #${result.ticketNumber}`);

      return {
        success: true,
        ticketNumber: result.ticketNumber,
      };
    } catch (error) {
      this.logger.error('Failed to process Postmark inbound webhook', {
        error: error.message,
        stack: error.stack,
      });

      // Return 200 to Postmark even on error to avoid retries
      // We've already notified the sender via email in the service
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Public()
  @Post('postmark/tracking')
  @HttpCode(200)
  @Throttle({ webhook: { limit: 100, ttl: 60000 } }) // Higher limit for tracking events
  async handlePostmarkTracking(@Body() trackingData: PostmarkTrackingWebhookDto) {
    this.logger.log(`Received Postmark ${trackingData.RecordType} webhook for ${trackingData.Recipient}`);

    try {
      await this.webhooksService.handleTrackingEvent(trackingData);

      this.logger.log(`Successfully processed ${trackingData.RecordType} event`);

      return {
        success: true,
        recordType: trackingData.RecordType,
      };
    } catch (error) {
      this.logger.error(`Failed to process Postmark tracking webhook: ${trackingData.RecordType}`, {
        error: error.message,
        stack: error.stack,
        messageId: trackingData.MessageID,
      });

      // Return 200 to Postmark even on error to avoid retries
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
