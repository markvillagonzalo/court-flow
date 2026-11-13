import assert from 'node:assert/strict';
import { AuthService } from './auth.service';

process.env.SESSION_SECRET = 'test-session-secret-that-is-long-enough-for-security';
const auth = new AuthService();

const staffToken = auth.issueStaffToken();
assert.equal(auth.verifyHeader(`Bearer ${staffToken}`)?.role, 'staff');
const tamperedToken = `${staffToken[0] === 'A' ? 'B' : 'A'}${staffToken.slice(1)}`;
assert.equal(auth.verifyHeader(`Bearer ${tamperedToken}`), null);
assert.equal(auth.verifyHeader(`Bearer ${'x'.repeat(9_000)}`), null);
assert.equal(auth.verifyHeader('Basic abc'), null);

const playerToken = auth.issuePlayerToken('session-id', 'player-id');
assert.equal(auth.verifyHeader(`Bearer ${playerToken}`)?.playerId, 'player-id');
assert.equal(auth.verifyHeader(`Bearer ${playerToken}`)?.sessionId, 'session-id');

assert.throws(() => auth.requireStaff(`Bearer ${playerToken}`));
assert.throws(() => auth.requirePlayer(`Bearer ${playerToken}`, 'another-session'));
assert.equal(auth.requirePlayer(`Bearer ${playerToken}`, 'session-id').playerId, 'player-id');

console.log('Auth security checks passed.');
