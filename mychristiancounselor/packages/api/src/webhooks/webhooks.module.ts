import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SupportModule } from '../support/support.module';
import { SalesModule } from '../sales/sales.module';
import { EmailModule } from '../email/email.module';
import { MarketingModule } from '../marketing/marketing.module';

@Module({
  imports: [PrismaModule, SupportModule, SalesModule, EmailModule, MarketingModule],
  controllers: [WebhooksController],
  providers: [WebhooksService],
})
export class WebhooksModule {}
