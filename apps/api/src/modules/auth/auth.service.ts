import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export type TokenClaims = {
  role: 'staff' | 'player';
  exp: number;
  sessionId?: string;
  playerId?: string;
};

@Injectable()
export class AuthService {
  private readonly secret =
    process.env.SESSION_SECRET ?? 'court-flow-local-development-secret-change-me';

  issueStaffToken(): string {
    return this.issue({ role: 'staff', exp: Date.now() + 12 * 60 * 60 * 1000 });
  }

  issuePlayerToken(sessionId: string, playerId: string): string {
    return this.issue({
      role: 'player',
      sessionId,
      playerId,
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
    });
  }

  verifyHeader(header?: string): TokenClaims | null {
    if (!header?.startsWith('Bearer ')) return null;
    try {
      return this.verify(header.slice(7));
    } catch {
      return null;
    }
  }

  requireStaff(header?: string): TokenClaims {
    const claims = this.verifyHeader(header);
    if (claims?.role !== 'staff') throw new UnauthorizedException('Staff access required');
    return claims;
  }

  requirePlayer(header?: string, sessionId?: string): TokenClaims {
    const claims = this.verifyHeader(header);
    if (
      claims?.role !== 'player' ||
      !claims.playerId ||
      (sessionId && claims.sessionId !== sessionId)
    ) {
      throw new UnauthorizedException('Join this queue to manage your ticket');
    }
    return claims;
  }

  newVisitorId(): string {
    return randomBytes(16).toString('hex');
  }

  private issue(claims: TokenClaims): string {
    const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
    const signature = createHmac('sha256', this.secret).update(payload).digest('base64url');
    return `${payload}.${signature}`;
  }

  private verify(token: string): TokenClaims {
    const [payload, signature, extra] = token.split('.');
    if (!payload || !signature || extra) throw new UnauthorizedException('Invalid token');
    const expected = createHmac('sha256', this.secret).update(payload).digest();
    const actual = Buffer.from(signature, 'base64url');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      throw new UnauthorizedException('Invalid token');
    }
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString()) as TokenClaims;
    if (!claims.exp || claims.exp < Date.now()) throw new UnauthorizedException('Session expired');
    return claims;
  }
}
