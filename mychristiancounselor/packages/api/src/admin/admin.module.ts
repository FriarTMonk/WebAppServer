import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AdminStatusController } from './admin-status.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { MorphAuditMiddleware } from './middleware/morph-audit.middleware';

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [AdminService, MorphAuditMiddleware],
  controllers: [AdminController, AdminStatusController],
  exports: [AdminService],
})
export class AdminModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply morph audit middleware to all routes
    // It will only log when user is morphed
    consumer.apply(MorphAuditMiddleware).forRoutes('*');
  }
}
