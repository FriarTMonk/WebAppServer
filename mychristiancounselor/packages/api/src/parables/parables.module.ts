import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ParablesController } from './parables.controller';
import { ParablesService } from './parables.service';

@Module({
  imports: [PrismaModule],
  controllers: [ParablesController],
  providers: [ParablesService],
  exports: [ParablesService],
})
export class ParablesModule {}
