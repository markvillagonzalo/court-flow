import assert from 'node:assert/strict';
import { clientIpFromProxy } from './client-ip';
import { isAllowedWebOrigin, requiresJsonBody } from './http-security';
import { FixedWindowRateLimiter } from './rate-limiter';
import { readRuntimeSecurityConfig } from './security-config';

const limiter = new FixedWindowRateLimiter(2, 1_000);
assert.equal(limiter.consume('client-a', 100).allowed, true);
assert.equal(limiter.consume('client-a', 200).allowed, true);
const blocked = limiter.consume('client-a', 300);
assert.equal(blocked.allowed, false);
assert.equal(blocked.retryAfterSeconds, 1);
assert.equal(limiter.consume('client-a', 1_100).allowed, true);
assert.equal(limiter.consume('client-b', 300).allowed, true);

const origins = new Set(['https://court.example.com']);
assert.equal(isAllowedWebOrigin(undefined, origins), true);
assert.equal(isAllowedWebOrigin('https://court.example.com', origins), true);
assert.equal(isAllowedWebOrigin('https://attacker.example', origins), false);
assert.equal(requiresJsonBody('POST', '/api/auth/staff'), true);
assert.equal(requiresJsonBody('POST', '/api/public/sessions/demo/join'), true);
assert.equal(requiresJsonBody('POST', '/api/staff/sessions/123/courts/123/call-next'), false);
assert.equal(requiresJsonBody('DELETE', '/api/player/me'), false);

const secureEnv = {
  SESSION_SECRET: 'a-random-session-secret-value-longer-than-32-characters',
  STAFF_PIN: '48261739',
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/courtflow',
  NODE_ENV: 'production',
  WEB_ORIGINS: 'https://court.example.com,https://staff.example.com',
  TRUST_PROXY_HOPS: '1',
};
const config = readRuntimeSecurityConfig(secureEnv);
assert.equal(config.webOrigins.size, 2);
assert.equal(config.trustedProxyHops, 1);
assert.equal(clientIpFromProxy('127.0.0.1', '192.0.2.10', 1), '192.0.2.10');
assert.equal(clientIpFromProxy('127.0.0.1', '192.0.2.10, 192.0.2.20', 1), '192.0.2.20');
assert.equal(clientIpFromProxy('127.0.0.1', '192.0.2.10, 192.0.2.20', 2), '192.0.2.10');
assert.equal(clientIpFromProxy('127.0.0.1', '192.0.2.10', 0), '127.0.0.1');
assert.throws(() => readRuntimeSecurityConfig({ ...secureEnv, STAFF_PIN: '2468' }));
assert.throws(() => readRuntimeSecurityConfig({ ...secureEnv, STAFF_PIN: '12345678' }));
assert.throws(() => readRuntimeSecurityConfig({ ...secureEnv, SESSION_SECRET: 'change-this-secret-value-longer-than-32-characters' }));
assert.throws(() => readRuntimeSecurityConfig({ ...secureEnv, WEB_ORIGINS: 'http://court.example.com' }));
assert.throws(() => readRuntimeSecurityConfig({ ...secureEnv, WEB_ORIGINS: '' }));
assert.throws(() => readRuntimeSecurityConfig({ ...secureEnv, DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/courtflow' }));
assert.throws(() => readRuntimeSecurityConfig({ ...secureEnv, DATABASE_URL: undefined }));

console.log('HTTP security checks passed.');
