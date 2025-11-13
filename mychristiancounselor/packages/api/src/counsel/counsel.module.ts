import { Module } from '@nestjs/common';
import { CounselService } from './counsel.service';
import { CounselController } from './counsel.controller';
import { AiModule } from '../ai/ai.module';
import { ScriptureModule } from '../scripture/scripture.module';
import { SafetyModule } from '../safety/safety.module';

@Module({
  imports: [AiModule, ScriptureModule, SafetyModule],
  controllers: [CounselController],
  providers: [CounselService],
})
export class CounselModule {}
