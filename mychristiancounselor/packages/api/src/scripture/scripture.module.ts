import { Module } from '@nestjs/common';
import { ScriptureService } from './scripture.service';
import { TranslationService } from './translation.service';
import { StrongsService } from './strongs.service';
import { StrongsController } from './strongs.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [StrongsController],
  providers: [ScriptureService, TranslationService, StrongsService],
  exports: [ScriptureService, TranslationService, StrongsService],
})
export class ScriptureModule {}
