import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PoolClient } from 'pg';
import { randomBytes } from 'node:crypto';
import type { SessionState } from '@court-flow/contracts';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { QueueGateway } from '../realtime/queue.gateway';

type CommandResult<T> = { value: T; replayed: boolean };
export type SessionRow = Record<string, any> & {
  id: string;
  name: string;
  public_code: string;
  sport: string;
  players_per_game: 2 | 4;
  state: SessionState;
  version: number;
  next_queue_order: string;
};

@Injectable()
export class SessionTransactionsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly realtime: QueueGateway,
  ) {}

  announceChange(code: string, version: number) {
    this.realtime.announceChange(code, version);
  }

  async runCommand<T>(
    sessionId: string,
    key: string | undefined,
    work: (client: PoolClient) => Promise<T>,
  ): Promise<CommandResult<T>> {
    if (!key || key.length > 100) throw new BadRequestException('A valid Idempotency-Key header is required');
    return this.db.transaction(async (client) => {
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`${sessionId}:${key}`]);
      const existing = await client.query(
        'SELECT response_json FROM command_receipts WHERE session_id = $1 AND command_key = $2',
        [sessionId, key],
      );
      if (existing.rowCount) return { value: existing.rows[0].response_json as T, replayed: true };
      const value = await work(client);
      await client.query(
        'INSERT INTO command_receipts (session_id, command_key, response_json) VALUES ($1, $2, $3)',
        [sessionId, key, JSON.stringify(value)],
      );
      return { value, replayed: false };
    });
  }

  async sessionByCode(code: string): Promise<SessionRow> {
    const cleanCode = code.trim().toLowerCase();
    const result = await this.db.query<SessionRow>(
      'SELECT * FROM sessions WHERE public_code = $1',
      [cleanCode],
    );
    if (!result.rowCount) throw new NotFoundException('Queue session not found');
    return result.rows[0];
  }

  async sessionById(id: string): Promise<SessionRow> {
    const result = await this.db.query<SessionRow>('SELECT * FROM sessions WHERE id = $1', [id]);
    if (!result.rowCount) throw new NotFoundException('Queue session not found');
    return result.rows[0];
  }

  async lockSession(client: PoolClient, id: string): Promise<SessionRow> {
    const result = await client.query<SessionRow>('SELECT * FROM sessions WHERE id = $1 FOR UPDATE', [id]);
    if (!result.rowCount) throw new NotFoundException('Queue session not found');
    return result.rows[0];
  }

  async bumpVersion(client: PoolClient, sessionId: string) {
    await client.query('UPDATE sessions SET version = version + 1 WHERE id = $1', [sessionId]);
  }

  async recordEvent(
    client: PoolClient,
    sessionId: string,
    eventType: string,
    actorType: 'staff' | 'player' | 'system',
    actorLabel: string,
    targetLabel: string,
    reason: string | null = null,
    details: Record<string, unknown> = {},
  ) {
    await client.query(
      `INSERT INTO audit_events
       (session_id, event_type, actor_type, actor_label, target_label, reason, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [sessionId, eventType, actorType, actorLabel, targetLabel, reason, JSON.stringify(details)],
    );
  }

  async uniquePublicCode(): Promise<string> {
    const alphabet = '23456789abcdefghjkmnpqrstuvwxyz';
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const bytes = randomBytes(7);
      const code = [...bytes].map((byte) => alphabet[byte % alphabet.length]).join('');
      const exists = await this.db.query('SELECT 1 FROM sessions WHERE public_code = $1', [code]);
      if (!exists.rowCount) return code;
    }
    throw new ConflictException('Could not allocate a unique session code');
  }
}
