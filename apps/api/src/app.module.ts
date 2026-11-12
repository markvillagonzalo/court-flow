import { Module } from '@nestjs/common';
import { CourtsModule } from './modules/courts/courts.module';
import { MatchesModule } from './modules/matches/matches.module';
import { QueueModule } from './modules/queue/queue.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { AuthModule } from './modules/auth/auth.module';
import { DatabaseModule } from './infrastructure/database/database.module';
import { AppController } from './app.controller';

@Module({
  imports: [DatabaseModule, RealtimeModule, AuthModule, SessionsModule, QueueModule, CourtsModule, MatchesModule],
  controllers: [AppController],
})
export class AppModule {}
