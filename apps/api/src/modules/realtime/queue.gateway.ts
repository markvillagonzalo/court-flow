import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import type { JoinSessionEvent, SessionChangedEvent } from '@court-flow/contracts';

@WebSocketGateway({
  cors: { origin: true },
  transports: ['websocket', 'polling'],
})
export class QueueGateway {
  @WebSocketServer()
  private server!: Server;

  @SubscribeMessage('session:join')
  joinSession(
    @MessageBody() payload: Partial<JoinSessionEvent>,
    @ConnectedSocket() client: Socket,
  ) {
    const code = payload?.code?.trim().toLowerCase();
    if (!code || !/^[a-z0-9-]{3,40}$/.test(code)) return { ok: false };
    void client.join(this.room(code));
    return { ok: true };
  }

  announceChange(code: string, version: number) {
    const event: SessionChangedEvent = { version };
    this.server?.to(this.room(code)).emit('session:changed', event);
  }

  private room(code: string) {
    return `public-session:${code}`;
  }
}
