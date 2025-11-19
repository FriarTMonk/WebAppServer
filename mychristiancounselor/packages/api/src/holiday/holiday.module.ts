import { Module } from '@nestjs/common';
import { HolidayService } from './holiday.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [HolidayService],
  exports: [HolidayService],
})
export class HolidayModule {}
