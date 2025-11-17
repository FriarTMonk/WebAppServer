import { Module } from '@nestjs/common';
import { OrgAdminController } from './org-admin.controller';
import { OrgAdminService } from './org-admin.service';
import { AdminModule } from '../admin/admin.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { OrganizationModule } from '../organization/organization.module';
import { CounselModule } from '../counsel/counsel.module';

@Module({
  imports: [
    AdminModule,
    PrismaModule,
    AuthModule,
    OrganizationModule,
    CounselModule,
  ],
  controllers: [OrgAdminController],
  providers: [OrgAdminService],
  exports: [OrgAdminService],
})
export class OrgAdminModule {}
