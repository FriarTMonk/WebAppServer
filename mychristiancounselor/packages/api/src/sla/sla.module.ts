import { Module } from '@nestjs/common';
import { SlaCalculatorService } from './sla-calculator.service';
import { SlaScheduler } from './sla.scheduler';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [SlaCalculatorService, SlaScheduler],
  exports: [SlaCalculatorService],
})
export class SlaModule {}
