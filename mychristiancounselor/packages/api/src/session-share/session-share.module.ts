import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionShare, CounselSession, User } from '@mcc/db';
import { SessionShareService } from './session-share.service';
import { SessionShareController, SharedSessionController } from './session-share.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SessionShare, CounselSession, User])],
  controllers: [SessionShareController, SharedSessionController],
  providers: [SessionShareService],
  exports: [SessionShareService],
})
export class SessionShareModule {}
