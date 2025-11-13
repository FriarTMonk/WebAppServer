import { Module } from '@nestjs/common';
import { ScriptureService } from './scripture.service';

@Module({
  providers: [ScriptureService],
  exports: [ScriptureService],
})
export class ScriptureModule {}
