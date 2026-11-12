import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { SessionTransactionsService } from '../sessions/session-transactions.service';
import { SessionsService } from '../sessions/sessions.service';

@Injectable()
export class CourtsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly transactions: SessionTransactionsService,
    private readonly sessions: SessionsService,
  ) {}

  async addCourt(sessionId: string, label: string) {
    const courtId = randomUUID();
    const event = await this.db.transaction(async (client) => {
      const session = await this.transactions.lockSession(client, sessionId);
      await client.query(
        'INSERT INTO courts (id, session_id, label) VALUES ($1, $2, $3)',
        [courtId, sessionId, label.trim()],
      );
      await this.transactions.bumpVersion(client, sessionId);
      await this.transactions.recordEvent(client, sessionId, 'court_added', 'staff', 'Venue staff', label.trim());
      return { publicCode: session.public_code, version: session.version + 1 };
    });
    this.transactions.announceChange(event.publicCode, event.version);
    return this.sessions.getStaffSnapshot(sessionId);
  }

  async archiveCourt(courtId: string) {
    const court = await this.db.query(
      'SELECT id, session_id FROM courts WHERE id = $1 AND archived_at IS NULL',
      [courtId],
    );
    if (!court.rowCount) throw new NotFoundException('Court not found');
    const sessionId = court.rows[0].session_id as string;
    const event = await this.db.transaction(async (client) => {
      const session = await this.transactions.lockSession(client, sessionId);
      const updated = await client.query(
        `UPDATE courts SET archived_at = now()
         WHERE id = $1 AND state = 'available' AND archived_at IS NULL`,
        [courtId],
      );
      if (!updated.rowCount) throw new ConflictException('A court can only be removed while it is available');
      await this.transactions.bumpVersion(client, sessionId);
      await this.transactions.recordEvent(client, sessionId, 'court_removed', 'staff', 'Venue staff', courtId);
      return { publicCode: session.public_code, version: session.version + 1 };
    });
    this.transactions.announceChange(event.publicCode, event.version);
    return this.sessions.getStaffSnapshot(sessionId);
  }
}
