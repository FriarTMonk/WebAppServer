import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ResourcesController } from './resources.controller';
import { OrganizationBrowseService } from './services/organization-browse.service';

@Module({
  imports: [PrismaModule],
  controllers: [ResourcesController],
  providers: [OrganizationBrowseService],
  exports: [],
})
export class ResourcesModule {}
