import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { SessionTransactionsService } from '../sessions/session-transactions.service';
import { SessionsService } from '../sessions/sessions.service';
import { normalizeReason } from './queue-rules';
import type { PlayerTicketStatus } from '@court-flow/contracts';

@Injectable()
export class QueueService {
  constructor(
    private readonly db: DatabaseService,
    private readonly transactions: SessionTransactionsService,
    private readonly sessions: SessionsService,
  ) {}

  async join(code: string, visitorId: string, displayName: string): Promise<{ id: string; sessionId: string; displayName: string; status: PlayerTicketStatus }> {
    const session = await this.transactions.sessionByCode(code);
    const cleanedName = displayName.trim().replace(/\s+/g, ' ');
    const visitorKey = visitorId.toLowerCase();
    if (cleanedName.length < 1 || cleanedName.length > 28) {
      throw new BadRequestException('Name must be between 1 and 28 characters');
    }
    const result = await this.db.transaction(async (client) => {
      const locked = await this.transactions.lockSession(client, session.id);
      if (locked.state !== 'open') throw new ConflictException('This session is not accepting players');
      const existing = await client.query(
        `SELECT id, session_id, display_name, status FROM player_tickets
         WHERE session_id = $1 AND visitor_id = $2 AND status IN ('waiting', 'playing')`,
        [session.id, visitorKey],
      );
      if (existing.rowCount) return { ticket: existing.rows[0], changed: false, version: locked.version };
      const nextOrder = Number(locked.next_queue_order) + 1;
      await client.query(
        'UPDATE sessions SET next_queue_order = $2, version = version + 1 WHERE id = $1',
        [session.id, nextOrder],
      );
      const inserted = await client.query(
        `INSERT INTO player_tickets (id, session_id, visitor_id, display_name, queue_order)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, session_id, display_name, status`,
        [randomUUID(), session.id, visitorKey, cleanedName, nextOrder],
      );
      await this.transactions.recordEvent(client, session.id, 'player_joined', 'player', cleanedName, cleanedName);
      return { ticket: inserted.rows[0], changed: true, version: locked.version + 1 };
    });
    if (result.changed) this.transactions.announceChange(session.public_code, result.version);
    const ticket = result.ticket;
    return {
      id: ticket.id as string,
      sessionId: ticket.session_id as string,
      displayName: ticket.display_name as string,
    status: ticket.status as PlayerTicketStatus,
    };
  }

  async withdraw(sessionId: string | undefined, playerId: string) {
    if (!sessionId) throw new BadRequestException('Player token has no session');
    const session = await this.transactions.sessionById(sessionId);
    const result = await this.db.transaction(async (client) => {
      const locked = await this.transactions.lockSession(client, sessionId);
      const ticket = await client.query(
        `SELECT id, display_name, status, leave_after_match FROM player_tickets
         WHERE id = $1 AND session_id = $2 FOR UPDATE`,
        [playerId, sessionId],
      );
      if (!ticket.rowCount) throw new NotFoundException('Player ticket not found');
      const row = ticket.rows[0];
      if (row.status === 'left') return { publicCode: locked.public_code, version: locked.version, status: 'left', changed: false };
      if (row.status === 'playing' && row.leave_after_match) {
        return { publicCode: locked.public_code, version: locked.version, status: 'leave_after_match', changed: false };
      }
      if (row.status === 'waiting') {
        await client.query(
          "UPDATE player_tickets SET status = 'left', updated_at = now() WHERE id = $1",
          [playerId],
        );
        await this.transactions.recordEvent(client, sessionId, 'player_left', 'player', row.display_name, row.display_name);
      } else if (row.status === 'playing') {
        await client.query(
          'UPDATE player_tickets SET leave_after_match = true, updated_at = now() WHERE id = $1',
          [playerId],
        );
        await this.transactions.recordEvent(client, sessionId, 'leave_after_match', 'player', row.display_name, row.display_name);
      } else {
        throw new ConflictException('This ticket is no longer active');
      }
      await this.transactions.bumpVersion(client, sessionId);
      return {
        publicCode: locked.public_code,
        version: locked.version + 1,
        status: row.status === 'playing' ? 'leave_after_match' : 'left',
        changed: true,
      };
    });
    if (result.changed) {
      this.transactions.announceChange(result.publicCode, result.version);
    }
    return { ok: true, status: result.status };
  }

  async skipTicket(sessionId: string, ticketId: string, rawReason: string, commandKey?: string) {
    const reason = normalizeReason(rawReason);
    const result = await this.transactions.runCommand(sessionId, commandKey, async (client) => {
      const session = await this.transactions.lockSession(client, sessionId);
      const ticket = await client.query(
        `SELECT id, display_name FROM player_tickets
         WHERE id = $1 AND session_id = $2 AND status = 'waiting' FOR UPDATE`,
        [ticketId, sessionId],
      );
      if (!ticket.rowCount) throw new ConflictException('Only a waiting player can be skipped');
      await client.query(
        "UPDATE player_tickets SET status = 'skipped', updated_at = now() WHERE id = $1",
        [ticketId],
      );
      await this.transactions.bumpVersion(client, sessionId);
      await this.transactions.recordEvent(client, sessionId, 'player_skipped', 'staff', 'Venue staff', ticket.rows[0].display_name, reason);
      return { publicCode: session.public_code, version: session.version + 1 };
    });
    if (!result.replayed) this.transactions.announceChange(result.value.publicCode, result.value.version);
    return this.sessions.getStaffSnapshot(sessionId);
  }

  async reorderTicket(
    sessionId: string,
    ticketId: string,
    target: 'front' | 'back',
    rawReason: string,
    commandKey?: string,
  ) {
    const reason = normalizeReason(rawReason);
    const result = await this.transactions.runCommand(sessionId, commandKey, async (client) => {
      const session = await this.transactions.lockSession(client, sessionId);
      const ticket = await client.query(
        `SELECT id, display_name, queue_order FROM player_tickets
         WHERE id = $1 AND session_id = $2 AND status = 'waiting' FOR UPDATE`,
        [ticketId, sessionId],
      );
      if (!ticket.rowCount) throw new ConflictException('Only a waiting player can be reordered');
      let queueOrder: number;
      if (target === 'front') {
        const first = await client.query(
          "SELECT coalesce(min(queue_order), 0) AS first_order FROM player_tickets WHERE session_id = $1 AND status = 'waiting'",
          [sessionId],
        );
        queueOrder = Number(first.rows[0].first_order) - 1;
      } else {
        queueOrder = Number(session.next_queue_order) + 1;
        await client.query('UPDATE sessions SET next_queue_order = $2 WHERE id = $1', [sessionId, queueOrder]);
      }
      await client.query(
        'UPDATE player_tickets SET queue_order = $2, updated_at = now() WHERE id = $1',
        [ticketId, queueOrder],
      );
      await this.transactions.bumpVersion(client, sessionId);
      const movement = target === 'front' ? 'moved to the front' : 'moved to the back';
      await this.transactions.recordEvent(
        client,
        sessionId,
        'queue_reordered',
        'staff',
        'Venue staff',
        `${ticket.rows[0].display_name} ${movement}`,
        reason,
      );
      return { publicCode: session.public_code, version: session.version + 1 };
    });
    if (!result.replayed) this.transactions.announceChange(result.value.publicCode, result.value.version);
    return this.sessions.getStaffSnapshot(sessionId);
  }
}
