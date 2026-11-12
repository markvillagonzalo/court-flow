import '../../env';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { MatchesService } from '../matches/matches.service';
import { QueueGateway } from '../realtime/queue.gateway';
import { SessionTransactionsService } from '../sessions/session-transactions.service';
import { SessionsService } from '../sessions/sessions.service';
import { QueueService } from './queue.service';

async function main() {
  const db = new DatabaseService();
  let sessionId: string | undefined;
  const realtimeEvents: { code: string; version: number }[] = [];
  let realtimeConnected = true;
  const realtime = {
    announceChange: (code: string, version: number) => {
      if (realtimeConnected) realtimeEvents.push({ code, version });
    },
  } as unknown as QueueGateway;
  const transactions = new SessionTransactionsService(db, realtime);
  const sessions = new SessionsService(db, transactions);
  const queue = new QueueService(db, transactions, sessions);
  const matches = new MatchesService(db, transactions, sessions);

  try {
    await db.query('SELECT 1');
    const created = await sessions.createSession({
      name: 'Integration smoke',
      sport: 'Pickleball',
      courtCount: 1,
      playersPerGame: 4,
    });
    sessionId = created.id;
    const sessionList = await sessions.listSessions();
    const session = sessionList.find((item) => item.id === created.id);
    assert.ok(session, 'created session should be listed');

    const joins = await Promise.all(
      Array.from({ length: 8 }, (_, index) =>
        queue.join(created.publicCode, randomUUID(), `Player ${index + 1}`),
      ),
    );
    const returningVisitor = randomUUID();
    const duplicateJoins = await Promise.all([
      queue.join(created.publicCode, returningVisitor, 'Repeat visitor'),
      queue.join(created.publicCode, returningVisitor, 'Repeat visitor'),
    ]);
    assert.equal(duplicateJoins[0].id, duplicateJoins[1].id, 'parallel check-ins from one browser create one ticket');

    let staff = await sessions.getStaffSnapshot(created.id);
    assert.equal(staff.queue.length, 9, 'all unique joins should be present once');
    assert.equal(new Set(staff.queue.map((ticket) => ticket.id)).size, 9);
    assert.deepEqual(
      staff.queue.map((ticket) => ticket.queueOrder),
      [...staff.queue.map((ticket) => ticket.queueOrder)].sort((left, right) => left - right),
      'the displayed line follows persisted FIFO positions',
    );
    assert.equal(joins.length, 8);

    const courtId = staff.courts[0].id;
    const firstCall = await matches.callNext(created.id, courtId, 'same-call-command');
    const replayedCall = await matches.callNext(created.id, courtId, 'same-call-command');
    assert.equal(firstCall.activeMatches.length, 1);
    assert.equal(replayedCall.activeMatches.length, 1, 'replaying a staff call does not double-assign players');
    assert.equal(firstCall.activeMatches[0].id, replayedCall.activeMatches[0].id);

    staff = await sessions.getStaffSnapshot(created.id);
    const waitingTicket = staff.queue[0];
    assert.ok(waitingTicket);
    assert.equal((await queue.withdraw(created.id, waitingTicket.id)).status, 'left');

    const match = staff.activeMatches[0];
    assert.ok(match);
    const matchPlayers = match.players as { id: string; displayName: string }[];
    assert.equal((await queue.withdraw(created.id, matchPlayers[0].id)).status, 'leave_after_match');
    const closed = await matches.completeMatch(
      match.id,
      matchPlayers.map((player) => player.id),
      'finish-match-command',
    );
    assert.equal(closed.activeMatches.length, 0);
    assert.equal(closed.courts[0].state, 'available');
    assert.equal(closed.queue.length, 7, 'the three returning players rejoin behind those already waiting');

    staff = await sessions.getStaffSnapshot(created.id);
    const skipped = staff.queue[0];
    await queue.skipTicket(created.id, skipped.id, 'Not present when called', 'skip-command');
    staff = await sessions.getStaffSnapshot(created.id);
    const moved = staff.queue[staff.queue.length - 1];
    const reordered = await queue.reorderTicket(
      created.id,
      moved.id,
      'front',
      'Player requested an accommodation',
      'reorder-command',
    );
    assert.equal(reordered.queue[0].id, moved.id, 'staff reorder is reflected in the public FIFO view');

    const publicView = await sessions.getPublicSnapshot(created.publicCode);
    assert.ok(publicView.recentActivity.some((item) => item.reason === 'Not present when called'));
    assert.ok(realtimeEvents.length >= 10, 'committed queue changes announce a session revision');

    const lastSeenVersion = publicView.session.version;
    realtimeConnected = false;
    await queue.join(created.publicCode, randomUUID(), 'Returned after disconnect');
    realtimeConnected = true;
    const recoveredView = await sessions.getPublicSnapshot(created.publicCode);
    assert.ok(recoveredView.session.version > lastSeenVersion, 'a reconnect snapshot includes revisions missed while offline');
    assert.ok(recoveredView.queue.some((ticket) => ticket.displayName === 'Returned after disconnect'));
    console.log('PostgreSQL queue integration smoke passed.');
  } finally {
    if (sessionId) {
      await db.query('DELETE FROM matches WHERE session_id = $1', [sessionId]);
      await db.query('DELETE FROM player_tickets WHERE session_id = $1', [sessionId]);
      await db.query('DELETE FROM sessions WHERE id = $1', [sessionId]);
    }
    await db.onModuleDestroy();
  }
}

void main().catch((error) => {
  console.error('PostgreSQL queue integration smoke failed.');
  console.error(error);
  process.exitCode = 1;
});
