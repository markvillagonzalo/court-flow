import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';
import { Body, Controller, Delete, Headers, Param, Post } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { QueueService } from './queue.service';
import type { JoinQueueRequest, JoinQueueResponse, ReasonRequest, ReorderRequest } from '@court-flow/contracts';

class JoinQueueDto implements JoinQueueRequest {
  @IsUUID()
  visitorId!: string;

  @IsString()
  @Length(1, 28)
  displayName!: string;
}

class ReasonDto implements ReasonRequest {
  @IsString()
  @Length(3, 240)
  reason!: string;
}

class ReorderDto extends ReasonDto implements ReorderRequest {
  @IsIn(['front', 'back'])
  target!: 'front' | 'back';
}

@Controller()
export class QueueController {
  constructor(private readonly queue: QueueService, private readonly auth: AuthService) {}

  @Post('public/sessions/:code/join')
  async joinQueue(@Param('code') code: string, @Body() body: JoinQueueDto): Promise<JoinQueueResponse> {
    const ticket = await this.queue.join(code, body.visitorId, body.displayName);
    return {
      token: this.auth.issuePlayerToken(ticket.sessionId, ticket.id),
      sessionId: ticket.sessionId,
      ticket: { displayName: ticket.displayName, status: ticket.status },
    };
  }

  @Delete('player/me')
  leaveQueue(@Headers('authorization') header?: string) {
    const claims = this.auth.requirePlayer(header);
    return this.queue.withdraw(claims.sessionId!, claims.playerId!);
  }

  @Post('staff/sessions/:sessionId/tickets/:ticketId/skip')
  skipTicket(
    @Param('sessionId') sessionId: string,
    @Param('ticketId') ticketId: string,
    @Headers('authorization') header: string | undefined,
    @Headers('idempotency-key') commandKey: string | undefined,
    @Body() body: ReasonDto,
  ) {
    this.auth.requireStaff(header);
    return this.queue.skipTicket(sessionId, ticketId, body.reason, commandKey);
  }

  @Post('staff/sessions/:sessionId/tickets/:ticketId/reorder')
  reorderTicket(
    @Param('sessionId') sessionId: string,
    @Param('ticketId') ticketId: string,
    @Headers('authorization') header: string | undefined,
    @Headers('idempotency-key') commandKey: string | undefined,
    @Body() body: ReorderDto,
  ) {
    this.auth.requireStaff(header);
    return this.queue.reorderTicket(sessionId, ticketId, body.target, body.reason, commandKey);
  }
}
