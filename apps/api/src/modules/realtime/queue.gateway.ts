import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import type { JoinSessionEvent, SessionChangedEvent } from '@court-flow/contracts';
import { isAllowedWebOrigin } from '../../security/http-security';
import { clientIpFromProxy } from '../../security/client-ip';
import { FixedWindowRateLimiter } from '../../security/rate-limiter';
import { readTrustedProxyHops, readWebOrigins } from '../../security/security-config';

const webOrigins = readWebOrigins();
const trustedProxyHops = readTrustedProxyHops();
const socketHandshakeLimiter = new FixedWindowRateLimiter(300, 60_000);

@WebSocketGateway({
  cors: { origin: [...webOrigins] },
  transports: ['websocket', 'polling'],
  maxHttpBufferSize: 16 * 1024,
  allowRequest: (request, callback) => {
    const origin = request.headers.origin;
    const originAllowed = isAllowedWebOrigin(origin, webOrigins);
    const clientIp = clientIpFromProxy(
      request.socket.remoteAddress,
      request.headers['x-forwarded-for'],
      trustedProxyHops,
    );
    const withinConnectionLimit = socketHandshakeLimiter.consume(clientIp).allowed;
    const allowed = originAllowed && withinConnectionLimit;
    callback(allowed ? null : 'Origin or connection limit rejected', allowed);
  },
})
export class QueueGateway {
  @WebSocketServer()
  private server!: Server;

  @SubscribeMessage('session:join')
  joinSession(
    @MessageBody() payload: Partial<JoinSessionEvent>,
    @ConnectedSocket() client: Socket,
  ) {
    if (typeof payload?.code !== 'string') return { ok: false };
    const code = payload.code.trim().toLowerCase();
    if (!code || !/^[a-z0-9-]{3,40}$/.test(code)) return { ok: false };
    const joinedCode = client.data.publicSessionCode as string | undefined;
    if (joinedCode && joinedCode !== code) return { ok: false };
    client.data.publicSessionCode = code;
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
