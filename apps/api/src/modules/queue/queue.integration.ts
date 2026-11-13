import '../../env';
import { ConflictException, NotFoundException } from '@nestjs/common';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { MatchesService } from '../matches/matches.service';
import { QueueGateway } from '../realtime/queue.gateway';
import { SessionTransactionsService } from '../sessions/session-transactions.service';
import { SessionsService } from '../sessions/sessions.service';
import { QueueService } from './queue.service';

async function verifyLegacyMatchMigration(db: DatabaseService) {
  const client = await db.pool.connect();
  const schemaName = `migration_smoke_${randomUUID().replaceAll('-', '')}`;
  try {
    await client.query(`CREATE SCHEMA "${schemaName}"`);
    await client.query(`SET search_path TO "${schemaName}"`);
    await client.query(`
      CREATE TABLE sessions (
        id uuid PRIMARY KEY, name text NOT NULL, public_code text NOT NULL UNIQUE,
        sport text NOT NULL DEFAULT 'Racquet sports', players_per_game smallint NOT NULL CHECK (players_per_game IN (2, 4)),
        state text NOT NULL DEFAULT 'open' CHECK (state IN ('open', 'closed')),
        version integer NOT NULL DEFAULT 1, next_queue_order bigint NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE courts (
        id uuid PRIMARY KEY, session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        label text NOT NULL, state text NOT NULL DEFAULT 'playing' CHECK (state IN ('available', 'playing')),
        archived_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE player_tickets (
        id uuid PRIMARY KEY, session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        visitor_id text NOT NULL, display_name text NOT NULL,
        status text NOT NULL DEFAULT 'playing' CHECK (status IN ('waiting', 'playing', 'left', 'skipped')),
        queue_order bigint NOT NULL, leave_after_match boolean NOT NULL DEFAULT false,
        joined_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE matches (
        id uuid PRIMARY KEY, session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        court_id uuid NOT NULL REFERENCES courts(id),
        status text NOT NULL DEFAULT 'playing' CHECK (status IN ('playing', 'completed')),
        started_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz
      );
      CREATE TABLE match_players (
        match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
        ticket_id uuid NOT NULL REFERENCES player_tickets(id), PRIMARY KEY (match_id, ticket_id)
      );
    `);
    const sessionId = randomUUID();
    const courtId = randomUUID();
    const matchId = randomUUID();
    await client.query(
      'INSERT INTO sessions (id, name, public_code, players_per_game) VALUES ($1, $2, $3, 4)',
      [sessionId, 'Legacy session', `migration-${sessionId}`],
    );
    await client.query('INSERT INTO courts (id, session_id, label) VALUES ($1, $2, $3)', [courtId, sessionId, 'Court 1']);
    await client.query('INSERT INTO matches (id, session_id, court_id, status) VALUES ($1, $2, $3, \'playing\')', [matchId, sessionId, courtId]);
    const ticketIds = Array.from({ length: 4 }, () => randomUUID());
    for (const [index, ticketId] of ticketIds.entries()) {
      await client.query(
        `INSERT INTO player_tickets (id, session_id, visitor_id, display_name, queue_order)
         VALUES ($1, $2, $3, $4, $5)`,
        [ticketId, sessionId, randomUUID(), `Legacy player ${index + 1}`, index + 1],
      );
      await client.query('INSERT INTO match_players (match_id, ticket_id) VALUES ($1, $2)', [matchId, ticketId]);
    }

    const schema = await readFile(resolve(__dirname, '../../../database/schema.sql'), 'utf8');
    await client.query(schema);
    const migrated = await client.query(
      `SELECT m.status, m.winner_side, p.display_name, mp.side
       FROM matches m JOIN match_players mp ON mp.match_id = m.id
       JOIN player_tickets p ON p.id = mp.ticket_id
       WHERE m.id = $1 ORDER BY p.queue_order`,
      [matchId],
    );
    assert.equal(migrated.rowCount, 4, 'migration preserves all players in the active match');
    assert.deepEqual(migrated.rows.map((row) => Number(row.side)), [1, 1, 2, 2], 'active match sides are backfilled deterministically');
    assert.ok(migrated.rows.every((row) => row.status === 'playing' && row.winner_side === null));
    await client.query("UPDATE matches SET status = 'completed', winner_side = 1, finished_at = now() WHERE id = $1", [matchId]);
    assert.equal((await client.query('SELECT winner_side FROM matches WHERE id = $1', [matchId])).rows[0].winner_side, 1);
  } finally {
    await client.query('RESET search_path').catch(() => undefined);
    await client.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`).catch(() => undefined);
    client.release();
  }
}

async function verifySessionDeletion(
  db: DatabaseService,
  sessions: SessionsService,
  queue: QueueService,
  realtimeEvents: { code: string; version: number }[],
) {
  const created = await sessions.createSession({
    name: 'Deletion integration',
    sport: 'Pickleball',
    courtCount: 1,
    playersPerGame: 2,
  });
  try {
    const ticket = await queue.join(created.publicCode, randomUUID(), 'Deletion player');
    const snapshot = await sessions.getStaffSnapshot(created.id);
    const courtId = snapshot.courts[0].id;
    const completedMatchId = randomUUID();
    const activeMatchId = randomUUID();

    await db.query(
      `INSERT INTO matches (id, session_id, court_id, status, finished_at, winner_side)
       VALUES ($1, $2, $3, 'completed', now(), 1)`,
      [completedMatchId, created.id, courtId],
    );
    await db.query(
      'INSERT INTO match_players (match_id, ticket_id, side) VALUES ($1, $2, 1)',
      [completedMatchId, ticket.id],
    );
    await db.query(
      "INSERT INTO matches (id, session_id, court_id, status) VALUES ($1, $2, $3, 'playing')",
      [activeMatchId, created.id, courtId],
    );

    await assert.rejects(
      sessions.deleteSession(created.id),
      (error: unknown) => error instanceof ConflictException,
      'deletion must be rejected while a match is active',
    );
    const preserved = await db.query(
      `SELECT
         (SELECT count(*)::int FROM sessions WHERE id = $1) AS sessions,
         (SELECT count(*)::int FROM matches WHERE session_id = $1) AS matches,
         (SELECT count(*)::int FROM player_tickets WHERE session_id = $1) AS tickets`,
      [created.id],
    );
    assert.deepEqual(preserved.rows[0], { sessions: 1, matches: 2, tickets: 1 }, 'rejected deletion leaves all session data intact');

    await db.query("UPDATE matches SET status = 'completed', finished_at = now(), winner_side = 2 WHERE id = $1", [activeMatchId]);
    await db.query(
      `INSERT INTO command_receipts (session_id, command_key, response_json)
       VALUES ($1, 'delete-integration-command', '{}'::jsonb)`,
      [created.id],
    );
    const eventCount = realtimeEvents.length;
    await sessions.deleteSession(created.id);

    const removed = await db.query(
      `SELECT
         (SELECT count(*)::int FROM sessions WHERE id = $1) AS sessions,
         (SELECT count(*)::int FROM courts WHERE session_id = $1) AS courts,
         (SELECT count(*)::int FROM matches WHERE session_id = $1) AS matches,
         (SELECT count(*)::int FROM match_players WHERE match_id = $2) AS match_players,
         (SELECT count(*)::int FROM player_tickets WHERE session_id = $1) AS tickets,
         (SELECT count(*)::int FROM audit_events WHERE session_id = $1) AS events,
         (SELECT count(*)::int FROM command_receipts WHERE session_id = $1) AS receipts`,
      [created.id, completedMatchId],
    );
    assert.deepEqual(
      removed.rows[0],
      { sessions: 0, courts: 0, matches: 0, match_players: 0, tickets: 0, events: 0, receipts: 0 },
      'deleting a session removes all of its data',
    );
    assert.ok(
      realtimeEvents.slice(eventCount).some((event) => event.code === created.publicCode),
      'deleting a session announces a final update to connected queue clients',
    );
    await assert.rejects(sessions.getPublicSnapshot(created.publicCode), /Queue session not found/);
    await assert.rejects(
      sessions.deleteSession(created.id),
      (error: unknown) => error instanceof NotFoundException,
      'deleting an unknown session returns not found',
    );
    return created.id;
  } finally {
    await db.query('DELETE FROM matches WHERE session_id = $1', [created.id]);
    await db.query('DELETE FROM player_tickets WHERE session_id = $1', [created.id]);
    await db.query('DELETE FROM sessions WHERE id = $1', [created.id]);
  }
}

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
    await verifyLegacyMatchMigration(db);
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
    const matchPlayers = match.players;
    assert.equal(matchPlayers.filter((player) => player.side === 1).length, 2, 'a doubles side has two players');
    assert.equal(matchPlayers.filter((player) => player.side === 2).length, 2, 'the other doubles side has two players');
    const winnerSide = matchPlayers[0].side;
    assert.equal((await queue.withdraw(created.id, matchPlayers[0].id)).status, 'leave_after_match');
    await assert.rejects(
      matches.completeMatch(match.id, matchPlayers.map((player) => player.id), 3 as 1 | 2),
      'invalid winning sides are rejected',
    );
    const closed = await matches.completeMatch(
      match.id,
      matchPlayers.map((player) => player.id),
      winnerSide,
      'finish-match-command',
    );
    assert.equal(closed.activeMatches.length, 0);
    assert.equal(closed.courts[0].state, 'available');
    assert.equal(closed.queue.length, 7, 'the three returning players rejoin behind those already waiting');
    assert.equal(closed.standings.length, 4, 'all match participants are counted');
    assert.equal(closed.recentResults.length, 1, 'the completed result is public');
    assert.equal(closed.recentResults[0].winningSide, winnerSide);
    for (const player of matchPlayers) {
      const standing = closed.standings.find((item) => item.displayName === player.displayName);
      assert.ok(standing);
      assert.equal(standing.played, 1);
      assert.equal(standing.wins, player.side === winnerSide ? 1 : 0);
      assert.equal(standing.losses, player.side === winnerSide ? 0 : 1);
    }
    const visitorResult = await db.query('SELECT visitor_id FROM player_tickets WHERE id = $1', [matchPlayers[0].id]);
    const rejoined = await queue.join(created.publicCode, visitorResult.rows[0].visitor_id, 'Returned under new name');
    assert.notEqual(rejoined.id, matchPlayers[0].id, 'a player who left can return on a new ticket');
    const afterRejoin = await sessions.getPublicSnapshot(created.publicCode);
    const mergedStanding = afterRejoin.standings.find((item) => item.displayName === 'Returned under new name');
    assert.deepEqual(
      { played: mergedStanding?.played, wins: mergedStanding?.wins, losses: mergedStanding?.losses },
      { played: 1, wins: winnerSide === matchPlayers[0].side ? 1 : 0, losses: winnerSide === matchPlayers[0].side ? 0 : 1 },
      'session totals follow the browser visitor identity across rejoin',
    );
    assert.equal(afterRejoin.recentResults[0].sides[winnerSide - 1].players.length, 2);

    const legacyMatchId = randomUUID();
    const opposingPlayers = matchPlayers.filter((player) => player.side !== matchPlayers[0].side);
    await db.query(
      `INSERT INTO matches (id, session_id, court_id, status, finished_at)
       VALUES ($1, $2, $3, 'completed', now() + interval '1 hour')`,
      [legacyMatchId, created.id, courtId],
    );
    await db.query(
      `INSERT INTO match_players (match_id, ticket_id, side)
       VALUES ($1, $2, $3), ($1, $4, $5)`,
      [legacyMatchId, matchPlayers[0].id, matchPlayers[0].side, opposingPlayers[0].id, opposingPlayers[0].side],
    );
    await db.query('UPDATE matches SET finished_at = now() - interval \'1 hour\' WHERE id = $1', [match.id]);
    const withoutLegacyResult = await sessions.getPublicSnapshot(created.publicCode);
    assert.equal(withoutLegacyResult.recentResults.length, 1, 'completed legacy matches without a winner stay out of history');
    assert.equal(withoutLegacyResult.standings.length, 4, 'legacy matches without a winner do not affect player totals');

    const nextCall = await matches.callNext(created.id, courtId, 'second-call-command');
    const nextMatch = nextCall.activeMatches[0];
    assert.ok(nextMatch);
    const nextWinnerSide = nextMatch.players[0].side;
    const afterSecondMatch = await matches.completeMatch(
      nextMatch.id,
      nextMatch.players.map((player) => player.id),
      nextWinnerSide,
      'second-finish-command',
    );
    assert.equal(afterSecondMatch.recentResults.length, 2);
    assert.equal(afterSecondMatch.recentResults[0].id, nextMatch.id, 'recent results are newest first');
    assert.equal(afterSecondMatch.recentResults[1].id, match.id);

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

    await verifySessionDeletion(db, sessions, queue, realtimeEvents);
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
