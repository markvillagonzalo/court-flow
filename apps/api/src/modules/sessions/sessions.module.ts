import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { SessionTransactionsService } from './session-transactions.service';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';

@Module({
  imports: [AuthModule, RealtimeModule],
  controllers: [SessionsController],
  providers: [SessionTransactionsService, SessionsService],
  exports: [SessionTransactionsService, SessionsService],
})
export class SessionsModule {}
