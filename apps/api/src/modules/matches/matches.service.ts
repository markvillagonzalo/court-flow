import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { SessionTransactionsService } from '../sessions/session-transactions.service';
import { SessionsService } from '../sessions/sessions.service';
import { takeNext } from '../queue/queue-rules';

@Injectable()
export class MatchesService {
  constructor(
    private readonly db: DatabaseService,
    private readonly transactions: SessionTransactionsService,
    private readonly sessions: SessionsService,
  ) {}

  async callNext(sessionId: string, courtId: string, commandKey?: string) {
    const result = await this.transactions.runCommand(sessionId, commandKey, async (client) => {
      const session = await this.transactions.lockSession(client, sessionId);
      const court = await client.query(
        `SELECT id, label, state FROM courts
         WHERE id = $1 AND session_id = $2 AND archived_at IS NULL FOR UPDATE`,
        [courtId, sessionId],
      );
      if (!court.rowCount) throw new NotFoundException('Court not found');
      if (court.rows[0].state !== 'available') throw new ConflictException('This court is already in use');
      const waiting = await client.query(
        `SELECT id, display_name, queue_order FROM player_tickets
         WHERE session_id = $1 AND status = 'waiting'
         ORDER BY queue_order, id LIMIT $2 FOR UPDATE`,
        [sessionId, session.players_per_game],
      );
      const nextPlayers = takeNext(
        waiting.rows.map((row) => ({ ...row, queueOrder: Number(row.queue_order) })),
        session.players_per_game,
      );
      if (nextPlayers.length < session.players_per_game) {
        throw new ConflictException(`Need ${session.players_per_game} waiting players to fill this court`);
      }
      const matchId = randomUUID();
      await client.query(
        `INSERT INTO matches (id, session_id, court_id, status)
         VALUES ($1, $2, $3, 'playing')`,
        [matchId, sessionId, courtId],
      );
      for (const player of nextPlayers) {
        await client.query(
          'INSERT INTO match_players (match_id, ticket_id) VALUES ($1, $2)',
          [matchId, player.id],
        );
        await client.query(
          "UPDATE player_tickets SET status = 'playing', updated_at = now() WHERE id = $1",
          [player.id],
        );
      }
      await client.query("UPDATE courts SET state = 'playing' WHERE id = $1", [courtId]);
      await this.transactions.bumpVersion(client, sessionId);
      const names = nextPlayers.map((player) => player.display_name).join(', ');
      await this.transactions.recordEvent(client, sessionId, 'players_called', 'staff', 'Venue staff', names, null, {
        court: court.rows[0].label,
      });
      return { matchId, publicCode: session.public_code, version: session.version + 1 };
    });
    if (!result.replayed) this.transactions.announceChange(result.value.publicCode, result.value.version);
    return this.sessions.getStaffSnapshot(sessionId);
  }

  async completeMatch(matchId: string, returningPlayerIds: string[], commandKey?: string) {
    const matchLookup = await this.db.query('SELECT session_id FROM matches WHERE id = $1', [matchId]);
    if (!matchLookup.rowCount) throw new NotFoundException('Match not found');
    const sessionId = matchLookup.rows[0].session_id as string;
    const result = await this.transactions.runCommand(sessionId, commandKey, async (client) => {
      const session = await this.transactions.lockSession(client, sessionId);
      const match = await client.query(
        `SELECT id, court_id, status FROM matches WHERE id = $1 AND session_id = $2 FOR UPDATE`,
        [matchId, sessionId],
      );
      if (!match.rowCount) throw new NotFoundException('Match not found');
      if (match.rows[0].status !== 'playing') throw new ConflictException('This match has already ended');
      const roster = await client.query(
        `SELECT p.id, p.display_name, p.leave_after_match
         FROM match_players mp JOIN player_tickets p ON p.id = mp.ticket_id
         WHERE mp.match_id = $1 FOR UPDATE OF p`,
        [matchId],
      );
      const rosterIds = new Set(roster.rows.map((row) => row.id as string));
      if (returningPlayerIds.some((id) => !rosterIds.has(id))) {
        throw new BadRequestException('Return list must contain only players from this match');
      }
      let nextOrder = Number(session.next_queue_order);
      const returned: string[] = [];
      const left: string[] = [];
      for (const player of roster.rows) {
        const shouldReturn = returningPlayerIds.includes(player.id) && !player.leave_after_match;
        if (shouldReturn) {
          nextOrder += 1;
          await client.query(
            `UPDATE player_tickets
             SET status = 'waiting', queue_order = $2, leave_after_match = false, updated_at = now()
             WHERE id = $1`,
            [player.id, nextOrder],
          );
          returned.push(player.display_name as string);
        } else {
          await client.query(
            "UPDATE player_tickets SET status = 'left', leave_after_match = false, updated_at = now() WHERE id = $1",
            [player.id],
          );
          left.push(player.display_name as string);
        }
      }
      await client.query(
        `UPDATE matches SET status = 'completed', finished_at = now() WHERE id = $1`,
        [matchId],
      );
      await client.query(
        "UPDATE courts SET state = 'available' WHERE id = $1",
        [match.rows[0].court_id],
      );
      await client.query(
        'UPDATE sessions SET next_queue_order = $2, version = version + 1 WHERE id = $1',
        [sessionId, nextOrder],
      );
      const target = returned.length ? `${returned.join(', ')} rejoined` : 'Court opened';
      await this.transactions.recordEvent(client, sessionId, 'match_completed', 'staff', 'Venue staff', target, null, {
        returned,
        left,
      });
      return { publicCode: session.public_code, version: session.version + 1 };
    });
    if (!result.replayed) this.transactions.announceChange(result.value.publicCode, result.value.version);
    return this.sessions.getStaffSnapshot(sessionId);
  }
}
