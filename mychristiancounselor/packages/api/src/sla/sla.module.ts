import { Module } from '@nestjs/common';
import { SlaCalculatorService } from './sla-calculator.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [SlaCalculatorService],
  exports: [SlaCalculatorService],
})
export class SlaModule {}
