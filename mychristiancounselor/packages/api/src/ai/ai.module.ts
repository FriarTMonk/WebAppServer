import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AiService } from './ai.service';
import { CounselingAiService } from './counseling-ai.service';
import { SupportAiService } from './support-ai.service';
import { AiScheduler } from './ai.scheduler';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    ScheduleModule.forRoot(),
  ],
  providers: [AiService, CounselingAiService, SupportAiService, AiScheduler],
  exports: [AiService, CounselingAiService, SupportAiService],
})
export class AiModule {}
