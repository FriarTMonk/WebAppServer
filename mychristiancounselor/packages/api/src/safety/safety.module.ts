import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { SafetyService } from './safety.service';

@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [SafetyService],
  exports: [SafetyService],
})
export class SafetyModule {}
