import { FixedWindowRateLimiter } from './rate-limiter';

type Request = {
  ip?: string;
  socket: { remoteAddress?: string };
  method: string;
  path: string;
  secure: boolean;
  is(mediaType: string): string | false;
};
type Response = {
  setHeader(name: string, value: string): void;
  status(code: number): Response;
  json(body: unknown): void;
};
type NextFunction = () => void;

const globalLimiter = new FixedWindowRateLimiter(300, 60_000);
const staffLoginLimiter = new FixedWindowRateLimiter(10, 15 * 60_000);
const playerJoinLimiter = new FixedWindowRateLimiter(30, 15 * 60_000);

export function isAllowedWebOrigin(origin: string | undefined, allowedOrigins: Set<string>) {
  return !origin || allowedOrigins.has(origin);
}

export function requiresJsonBody(method: string, path: string) {
  if (method !== 'POST') return false;
  return path === '/api/auth/staff' ||
    /^\/api\/public\/sessions\/[^/]+\/join$/.test(path) ||
    path === '/api/staff/sessions' ||
    /^\/api\/staff\/sessions\/[^/]+\/courts$/.test(path) ||
    /^\/api\/staff\/sessions\/[^/]+\/tickets\/[^/]+\/(skip|reorder)$/.test(path) ||
    /^\/api\/staff\/matches\/[^/]+\/complete$/.test(path);
}

function applyLimit(
  limiter: FixedWindowRateLimiter,
  bucket: string,
  request: Request,
  response: Response,
) {
  const ip = request.ip || request.socket.remoteAddress || 'unknown';
  const decision = limiter.consume(`${bucket}:${ip}`);
  const limit = bucket === 'global' ? 300 : bucket === 'staff-login' ? 10 : 30;
  response.setHeader('RateLimit-Limit', String(limit));
  response.setHeader('RateLimit-Remaining', String(decision.remaining));
  response.setHeader('RateLimit-Reset', String(Math.ceil(Math.max(0, decision.resetAt - Date.now()) / 1000)));
  if (decision.allowed) return true;

  response.setHeader('Retry-After', String(decision.retryAfterSeconds));
  response.status(429).json({ statusCode: 429, message: 'Too many requests. Please try again later.' });
  return false;
}

export function createHttpSecurityMiddleware() {
  return (request: Request, response: Response, next: NextFunction) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    response.setHeader('Cache-Control', 'no-store');
    if (process.env.NODE_ENV === 'production' && request.secure) {
      response.setHeader('Strict-Transport-Security', 'max-age=31536000');
    }

    if (requiresJsonBody(request.method, request.path) && !request.is('application/json')) {
      response.status(415).json({ statusCode: 415, message: 'Content-Type must be application/json' });
      return;
    }

    if (!request.path.startsWith('/api/')) return next();
    if (!applyLimit(globalLimiter, 'global', request, response)) return;
    if (request.method === 'POST' && request.path === '/api/auth/staff') {
      if (!applyLimit(staffLoginLimiter, 'staff-login', request, response)) return;
    }
    if (request.method === 'POST' && /^\/api\/public\/sessions\/[^/]+\/join$/.test(request.path)) {
      if (!applyLimit(playerJoinLimiter, 'player-join', request, response)) return;
    }
    next();
  };
}

