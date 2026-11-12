import { ArrayMaxSize, IsArray, IsUUID } from 'class-validator';
import { Body, Controller, Headers, Param, Post } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { MatchesService } from './matches.service';
import type { CompleteMatchRequest } from '@court-flow/contracts';

class CompleteMatchDto implements CompleteMatchRequest {
  @IsArray()
  @ArrayMaxSize(16)
  @IsUUID('all', { each: true })
  returningPlayerIds!: string[];
}

@Controller()
export class MatchesController {
  constructor(private readonly matches: MatchesService, private readonly auth: AuthService) {}

  @Post('staff/sessions/:sessionId/courts/:courtId/call-next')
  callNext(
    @Param('sessionId') sessionId: string,
    @Param('courtId') courtId: string,
    @Headers('authorization') header: string | undefined,
    @Headers('idempotency-key') commandKey: string | undefined,
  ) {
    this.auth.requireStaff(header);
    return this.matches.callNext(sessionId, courtId, commandKey);
  }

  @Post('staff/matches/:matchId/complete')
  completeMatch(
    @Param('matchId') matchId: string,
    @Headers('authorization') header: string | undefined,
    @Headers('idempotency-key') commandKey: string | undefined,
    @Body() body: CompleteMatchDto,
  ) {
    this.auth.requireStaff(header);
    return this.matches.completeMatch(matchId, body.returningPlayerIds, commandKey);
  }
}
