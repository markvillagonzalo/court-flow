export type RateLimitDecision = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};

type RateLimitEntry = { count: number; resetAt: number };

export class FixedWindowRateLimiter {
  private readonly entries = new Map<string, RateLimitEntry>();
  private operations = 0;

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly maxEntries = 50_000,
  ) {
    if (!Number.isInteger(limit) || limit < 1) throw new Error('Rate limit must be a positive integer');
    if (!Number.isInteger(windowMs) || windowMs < 1) throw new Error('Rate window must be a positive integer');
  }

  consume(key: string, now = Date.now()): RateLimitDecision {
    this.operations += 1;
    if ((this.operations & 255) === 0) this.prune(now);

    let entry = this.entries.get(key);
    if (!entry || now >= entry.resetAt) {
      if (this.entries.size >= this.maxEntries) this.prune(now);
      if (this.entries.size >= this.maxEntries) {
        let resetAt = Number.POSITIVE_INFINITY;
        for (const item of this.entries.values()) resetAt = Math.min(resetAt, item.resetAt);
        return this.denied(resetAt, now);
      }
      entry = { count: 0, resetAt: now + this.windowMs };
      this.entries.set(key, entry);
    }

    if (entry.count >= this.limit) return this.denied(entry.resetAt, now);
    entry.count += 1;
    return {
      allowed: true,
      remaining: this.limit - entry.count,
      resetAt: entry.resetAt,
      retryAfterSeconds: 0,
    };
  }

  private denied(resetAt: number, now: number): RateLimitDecision {
    return {
      allowed: false,
      remaining: 0,
      resetAt,
      retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)),
    };
  }

  private prune(now: number) {
    for (const [key, entry] of this.entries) {
      if (now >= entry.resetAt) this.entries.delete(key);
    }
  }
}

