import assert from 'node:assert/strict';
import { createHttpSecurityMiddleware } from './http-security';

const middleware = createHttpSecurityMiddleware();

function send(method: string, path: string, ip: string, json = true) {
  const headers: Record<string, string> = {};
  let statusCode = 200;
  let body: unknown;
  let calledNext = false;
  const request = {
    method,
    path,
    ip,
    socket: { remoteAddress: ip },
    secure: false,
    is: (contentType: string) => json && contentType === 'application/json' ? 'application/json' : false,
  };
  const response = {
    setHeader: (name: string, value: string) => { headers[name] = value; },
    status: (code: number) => {
      statusCode = code;
      return response;
    },
    json: (value: unknown) => { body = value; },
  };

  middleware(
    request as Parameters<typeof middleware>[0],
    response as unknown as Parameters<typeof middleware>[1],
    (() => { calledNext = true; }) as Parameters<typeof middleware>[2],
  );
  return { headers, statusCode, body, calledNext };
}

const wrongContentType = send('POST', '/api/auth/staff', '192.0.2.1', false);
assert.equal(wrongContentType.statusCode, 415);
assert.equal(wrongContentType.calledNext, false);
assert.equal(wrongContentType.headers['X-Content-Type-Options'], 'nosniff');
assert.equal(wrongContentType.headers['X-Frame-Options'], 'DENY');
assert.equal(wrongContentType.headers['Cache-Control'], 'no-store');

for (let attempt = 0; attempt < 10; attempt += 1) {
  assert.equal(send('POST', '/api/auth/staff', '192.0.2.2').calledNext, true);
}
const throttled = send('POST', '/api/auth/staff', '192.0.2.2');
assert.equal(throttled.statusCode, 429);
assert.equal(throttled.calledNext, false);
assert.ok(Number(throttled.headers['Retry-After']) > 0);

for (let attempt = 0; attempt < 30; attempt += 1) {
  assert.equal(send('POST', '/api/public/sessions/demo/join', '192.0.2.4').calledNext, true);
}
const joinThrottled = send('POST', '/api/public/sessions/demo/join', '192.0.2.4');
assert.equal(joinThrottled.statusCode, 429);

assert.equal(send('GET', '/api/health', '192.0.2.3').calledNext, true);
console.log('HTTP middleware security checks passed.');
