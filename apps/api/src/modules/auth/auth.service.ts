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
  private readonly secret: string;

  constructor() {
    const secret = process.env.SESSION_SECRET?.trim();
    if (!secret || secret.length < 32) {
      throw new Error('SESSION_SECRET must be configured with at least 32 characters before starting the API');
    }
    this.secret = secret;
  }

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
    if (!header?.startsWith('Bearer ') || header.length > 8_200) return null;
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
    if (token.length > 8_192) throw new UnauthorizedException('Invalid token');
    const [payload, signature, extra] = token.split('.');
    if (
      !payload ||
      payload.length > 4_096 ||
      !/^[A-Za-z0-9_-]+$/.test(payload) ||
      !signature ||
      !/^[A-Za-z0-9_-]{43}$/.test(signature) ||
      extra
    ) {
      throw new UnauthorizedException('Invalid token');
    }
    const expected = createHmac('sha256', this.secret).update(payload).digest();
    const actual = Buffer.from(signature, 'base64url');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      throw new UnauthorizedException('Invalid token');
    }
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString()) as TokenClaims;
    if (
      !claims ||
      typeof claims !== 'object' ||
      !Number.isSafeInteger(claims.exp) ||
      claims.exp <= Date.now() ||
      !['staff', 'player'].includes(claims.role)
    ) {
      throw new UnauthorizedException('Invalid token');
    }
    if (claims.role === 'player' && (typeof claims.sessionId !== 'string' || typeof claims.playerId !== 'string')) {
      throw new UnauthorizedException('Invalid token');
    }
    return claims;
  }
}
