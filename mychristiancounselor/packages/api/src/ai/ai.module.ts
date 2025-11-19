import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AiService } from './ai.service';
import { AiScheduler } from './ai.scheduler';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    ScheduleModule.forRoot(),
  ],
  providers: [AiService, AiScheduler],
  exports: [AiService],
})
export class AiModule {}
