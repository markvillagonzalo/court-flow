import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { SessionTransactionsService } from './session-transactions.service';
import type { SessionRow } from './session-transactions.service';
import type {
  CreateSessionRequest,
  CreateSessionResponse,
  MatchSide,
  QueueSnapshot,
  StaffSessionListItem,
  StaffSnapshot,
} from '@court-flow/contracts';

@Injectable()
export class SessionsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly transactions: SessionTransactionsService,
  ) {}

  async getPublicSnapshot(code: string, playerId?: string, playerSessionId?: string): Promise<QueueSnapshot> {
    const session = await this.transactions.sessionByCode(code);
    const [courts, waiting, activeMatches, activity, standings, recentResults] = await Promise.all([
      this.db.query(
        `SELECT id, label, state FROM courts
         WHERE session_id = $1 AND archived_at IS NULL ORDER BY created_at, label`,
        [session.id],
      ),
      this.db.query(
        `SELECT display_name, queue_order, joined_at
         FROM player_tickets WHERE session_id = $1 AND status = 'waiting'
         ORDER BY queue_order, id`,
        [session.id],
      ),
      this.db.query(
        `SELECT m.id, m.started_at, c.label AS court_label,
                p.display_name, p.id AS player_id, mp.side
         FROM matches m
         JOIN courts c ON c.id = m.court_id
         JOIN match_players mp ON mp.match_id = m.id
         JOIN player_tickets p ON p.id = mp.ticket_id
         WHERE m.session_id = $1 AND m.status = 'playing'
         ORDER BY c.created_at, mp.side, p.display_name`,
        [session.id],
      ),
      this.db.query(
        `SELECT event_type, target_label, reason, created_at
         FROM audit_events WHERE session_id = $1
         ORDER BY created_at DESC, id DESC LIMIT 7`,
        [session.id],
      ),
      this.db.query(
        `WITH records AS (
           SELECT p.visitor_id,
                  count(*)::int AS played,
                  count(*) FILTER (WHERE mp.side = m.winner_side)::int AS wins,
                  count(*) FILTER (WHERE mp.side <> m.winner_side)::int AS losses
           FROM matches m
           JOIN match_players mp ON mp.match_id = m.id
           JOIN player_tickets p ON p.id = mp.ticket_id
           WHERE m.session_id = $1 AND m.status = 'completed' AND m.winner_side IS NOT NULL
           GROUP BY p.visitor_id
         )
         SELECT (
                  SELECT p.display_name FROM player_tickets p
                  WHERE p.session_id = $1 AND p.visitor_id = records.visitor_id
                  ORDER BY p.joined_at DESC, p.id DESC LIMIT 1
                ) AS display_name,
                records.played, records.wins, records.losses
         FROM records
         ORDER BY records.wins DESC, records.losses ASC, display_name ASC`,
        [session.id],
      ),
      this.db.query(
        `WITH recent AS (
           SELECT m.id, m.started_at, m.finished_at, m.winner_side, m.court_id
           FROM matches m
           WHERE m.session_id = $1 AND m.status = 'completed' AND m.winner_side IS NOT NULL
           ORDER BY m.finished_at DESC, m.id DESC
           LIMIT 10
         )
         SELECT recent.id, recent.started_at, recent.finished_at, recent.winner_side,
                c.label AS court_label, p.display_name, mp.side
         FROM recent
         JOIN courts c ON c.id = recent.court_id
         JOIN match_players mp ON mp.match_id = recent.id
         JOIN player_tickets p ON p.id = mp.ticket_id
         ORDER BY recent.finished_at DESC, recent.id DESC, mp.side, p.display_name`,
        [session.id],
      ),
    ]);

    const myTicket =
      playerId && playerSessionId === session.id
        ? await this.ticketForPlayer(session.id, playerId)
        : null;
    const queue = waiting.rows.map((row, index) => ({
      displayName: row.display_name as string,
      position: index + 1,
      joinedAt: row.joined_at,
    }));
    const liveMatches = this.groupMatches(activeMatches.rows);
    const courtList = courts.rows.map((row) => ({
      id: row.id as string,
      label: row.label as string,
    state: row.state as 'available' | 'playing',
    }));

    const myPosition = myTicket?.status === 'waiting'
      ? await this.playerPosition(session.id, myTicket.id, myTicket.queue_order)
      : null;

    return {
      session: this.publicSessionFields(session),
      courts: courtList,
      queue,
      waitingCount: queue.length,
      activeMatches: liveMatches,
      standings: standings.rows.map((row) => ({
        displayName: row.display_name as string,
        played: Number(row.played),
        wins: Number(row.wins),
        losses: Number(row.losses),
      })),
      recentResults: this.groupCompletedMatches(recentResults.rows),
      myTicket: myTicket
        ? {
            displayName: myTicket.display_name,
            status: myTicket.status,
            position: myPosition,
            leaveAfterMatch: myTicket.leave_after_match,
          }
        : null,
      recentActivity: activity.rows.map((row) => ({
        eventType: row.event_type,
        target: row.target_label,
        reason: row.reason,
        createdAt: row.created_at,
      })),
    };
  }

  async getStaffSnapshot(sessionId: string): Promise<StaffSnapshot> {
    const session = await this.transactions.sessionById(sessionId);
    const [snapshot, tickets, matches] = await Promise.all([
      this.getPublicSnapshot(session.public_code),
      this.db.query(
        `SELECT id, display_name, queue_order, joined_at, status
         FROM player_tickets WHERE session_id = $1 AND status = 'waiting'
         ORDER BY queue_order, id`,
        [sessionId],
      ),
      this.db.query(
        `SELECT m.id, m.started_at, c.id AS court_id, c.label AS court_label,
                p.id AS ticket_id, p.display_name, p.leave_after_match, mp.side
         FROM matches m JOIN courts c ON c.id = m.court_id
         JOIN match_players mp ON mp.match_id = m.id
         JOIN player_tickets p ON p.id = mp.ticket_id
         WHERE m.session_id = $1 AND m.status = 'playing'
         ORDER BY c.created_at, mp.side, p.display_name`,
        [sessionId],
      ),
    ]);
    return {
      ...snapshot,
    myTicket: null,
      queue: tickets.rows.map((row, index) => ({
        id: row.id,
        displayName: row.display_name,
        queueOrder: Number(row.queue_order),
        joinedAt: row.joined_at,
        position: index + 1,
      })),
      activeMatches: this.groupStaffMatches(matches.rows),
    };
  }

  async listSessions(): Promise<StaffSessionListItem[]> {
    const result = await this.db.query(
      `SELECT s.id, s.name, s.public_code, s.sport, s.players_per_game, s.state,
              s.version, s.created_at,
              (SELECT count(*)::int FROM courts c WHERE c.session_id = s.id AND c.archived_at IS NULL) AS court_count,
              (SELECT count(*)::int FROM player_tickets p WHERE p.session_id = s.id AND p.status = 'waiting') AS waiting_count
       FROM sessions s ORDER BY s.created_at DESC`,
    );
    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      publicCode: row.public_code,
      sport: row.sport,
      playersPerGame: row.players_per_game,
      state: row.state,
      version: row.version,
      courtCount: row.court_count,
      waitingCount: row.waiting_count,
      createdAt: row.created_at,
    }));
  }

  async createSession(input: CreateSessionRequest): Promise<CreateSessionResponse> {
    const id = randomUUID();
    const code = await this.transactions.uniquePublicCode();
    await this.db.transaction(async (client) => {
      await client.query(
        `INSERT INTO sessions (id, name, public_code, sport, players_per_game)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, input.name.trim(), code, input.sport.trim(), input.playersPerGame],
      );
      for (let index = 1; index <= input.courtCount; index += 1) {
        await client.query(
          'INSERT INTO courts (id, session_id, label) VALUES ($1, $2, $3)',
          [randomUUID(), id, `Court ${index}`],
        );
      }
      await this.transactions.recordEvent(client, id, 'session_created', 'staff', 'Venue staff', input.name.trim());
    });
    const session = await this.transactions.sessionById(id);
    this.transactions.announceChange(session.public_code, session.version);
    return { id, publicCode: code };
  }

  async deleteSession(sessionId: string): Promise<void> {
    const deleted = await this.db.transaction(async (client) => {
      const sessionResult = await client.query<SessionRow>(
        'SELECT * FROM sessions WHERE id = $1 FOR UPDATE',
        [sessionId],
      );
      if (!sessionResult.rowCount) throw new NotFoundException('Queue session not found');
      const session = sessionResult.rows[0];

      const activeMatches = await client.query(
        "SELECT 1 FROM matches WHERE session_id = $1 AND status = 'playing' LIMIT 1",
        [sessionId],
      );
      if (activeMatches.rowCount) {
        throw new ConflictException('Finish all matches before deleting this session');
      }

      // These foreign keys intentionally restrict deleting courts and tickets directly.
      // Remove the session's match links and matches first, then its player tickets.
      await client.query(
        'DELETE FROM match_players WHERE match_id IN (SELECT id FROM matches WHERE session_id = $1)',
        [sessionId],
      );
      await client.query('DELETE FROM matches WHERE session_id = $1', [sessionId]);
      await client.query('DELETE FROM player_tickets WHERE session_id = $1', [sessionId]);
      await client.query('DELETE FROM sessions WHERE id = $1', [sessionId]);

      return { publicCode: session.public_code, version: Number(session.version) + 1 };
    });

    this.transactions.announceChange(deleted.publicCode, deleted.version);
  }

  private async ticketForPlayer(sessionId: string, playerId: string) {
    const result = await this.db.query(
      `SELECT id, display_name, status, queue_order, leave_after_match
       FROM player_tickets WHERE id = $1 AND session_id = $2`,
      [playerId, sessionId],
    );
    return result.rows[0] ?? null;
  }

  private async playerPosition(sessionId: string, playerId: string, queueOrder: string | number) {
    const result = await this.db.query(
      `SELECT count(*)::int AS position FROM player_tickets
       WHERE session_id = $1 AND status = 'waiting'
         AND (queue_order < $2 OR (queue_order = $2 AND id <= $3))`,
      [sessionId, queueOrder, playerId],
    );
    return result.rows[0].position as number;
  }

  private publicSessionFields(session: SessionRow) {
    return {
      id: session.id,
      name: session.name,
      publicCode: session.public_code,
      sport: session.sport,
      playersPerGame: session.players_per_game,
      state: session.state,
      version: session.version,
    };
  }

  private groupMatches(rows: any[]) {
    const byId = new Map<string, any>();
    for (const row of rows) {
      const match = byId.get(row.id) ?? {
        id: row.id,
        courtLabel: row.court_label,
        startedAt: row.started_at,
        players: [],
      };
      match.players.push({ displayName: row.display_name, side: Number(row.side) as MatchSide });
      byId.set(row.id, match);
    }
    return [...byId.values()];
  }

  private groupStaffMatches(rows: any[]) {
    const byId = new Map<string, any>();
    for (const row of rows) {
      const match = byId.get(row.id) ?? {
        id: row.id,
        courtId: row.court_id,
        courtLabel: row.court_label,
        startedAt: row.started_at,
        players: [],
      };
      match.players.push({
        id: row.ticket_id,
        displayName: row.display_name,
        leaveAfterMatch: row.leave_after_match,
        side: Number(row.side) as MatchSide,
      });
      byId.set(row.id, match);
    }
    return [...byId.values()];
  }

  private groupCompletedMatches(rows: any[]) {
    const byId = new Map<string, any>();
    for (const row of rows) {
      const match = byId.get(row.id) ?? {
        id: row.id,
        courtLabel: row.court_label,
        startedAt: row.started_at,
        finishedAt: row.finished_at,
        winningSide: Number(row.winner_side) as MatchSide,
        sides: [
          { side: 1 as const, players: [] as string[] },
          { side: 2 as const, players: [] as string[] },
        ],
      };
      const side = Number(row.side) as MatchSide;
      match.sides[side - 1].players.push(row.display_name);
      byId.set(row.id, match);
    }
    return [...byId.values()];
  }
}
