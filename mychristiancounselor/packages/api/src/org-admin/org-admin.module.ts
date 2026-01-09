import { Module } from '@nestjs/common';
import { OrgAdminController } from './org-admin.controller';
import { OrgAdminService } from './org-admin.service';
import { AdminModule } from '../admin/admin.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { OrganizationModule } from '../organization/organization.module';
import { CounselModule } from '../counsel/counsel.module';
import { EmailModule } from '../email/email.module';
import { BookModule } from '../book/book.module';
import { OrgBookSettingsService } from './services/org-book-settings.service';

@Module({
  imports: [
    AdminModule,
    PrismaModule,
    AuthModule,
    OrganizationModule,
    CounselModule,
    EmailModule,
    BookModule,
  ],
  controllers: [OrgAdminController],
  providers: [OrgAdminService, OrgBookSettingsService],
  exports: [OrgAdminService],
})
export class OrgAdminModule {}
