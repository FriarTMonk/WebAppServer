import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SalesService } from './sales.service';
import { SalesPerformanceService } from './sales-performance.service';
import { SalesController } from './sales.controller';

@Module({
  imports: [PrismaModule],
  controllers: [SalesController],
  providers: [SalesService, SalesPerformanceService],
  exports: [SalesService, SalesPerformanceService],
})
export class SalesModule {}
