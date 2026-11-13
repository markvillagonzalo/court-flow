import { Body, Controller, Delete, Get, Headers, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { IsIn, IsInt, IsString, Length, Max, Min } from 'class-validator';
import type { CreateSessionRequest, QueueSnapshot } from '@court-flow/contracts';
import { AuthService } from '../auth/auth.service';
import { SessionsService } from './sessions.service';

class CreateSessionDto implements CreateSessionRequest {
  @IsString()
  @Length(2, 60)
  name!: string;

  @IsString()
  @Length(2, 30)
  sport!: string;

  @IsInt()
  @Min(1)
  @Max(16)
  courtCount!: number;

  @IsInt()
  @IsIn([2, 4])
  playersPerGame!: 2 | 4;
}

@Controller()
export class SessionsController {
  constructor(private readonly sessions: SessionsService, private readonly auth: AuthService) {}

  @Get('public/sessions/:code')
  async publicSession(@Param('code') code: string, @Headers('authorization') header?: string): Promise<QueueSnapshot> {
    const claims = this.auth.verifyHeader(header);
    return this.sessions.getPublicSnapshot(
      code,
      claims?.role === 'player' ? claims.playerId : undefined,
      claims?.role === 'player' ? claims.sessionId : undefined,
    );
  }

  @Get('staff/sessions')
  staffSessions(@Headers('authorization') header?: string) {
    this.auth.requireStaff(header);
    return this.sessions.listSessions();
  }

  @Post('staff/sessions')
  createSession(@Headers('authorization') header: string | undefined, @Body() body: CreateSessionDto) {
    this.auth.requireStaff(header);
    return this.sessions.createSession(body);
  }

  @Get('staff/sessions/:sessionId')
  staffSnapshot(
    @Param('sessionId') sessionId: string,
    @Headers('authorization') header?: string,
  ) {
    this.auth.requireStaff(header);
    return this.sessions.getStaffSnapshot(sessionId);
  }

  @Delete('staff/sessions/:sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteSession(
    @Param('sessionId') sessionId: string,
    @Headers('authorization') header?: string,
  ) {
    this.auth.requireStaff(header);
    return this.sessions.deleteSession(sessionId);
  }
}
