import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SessionsModule } from '../sessions/sessions.module';
import { CourtsController } from './courts.controller';
import { CourtsService } from './courts.service';

@Module({
  imports: [AuthModule, SessionsModule],
  controllers: [CourtsController],
  providers: [CourtsService],
})
export class CourtsModule {}
