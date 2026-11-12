import { config } from 'dotenv';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Pool } from 'pg';

config({ path: resolve(__dirname, '../../../../../.env') });
config();

async function main() {
  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ??
      'postgresql://postgres:postgres@localhost:5433/courtflow',
  });
  try {
    const schema = await readFile(resolve(__dirname, '../../../database/schema.sql'), 'utf8');
    await pool.query(schema);
    const sessionId = '78400000-0000-4000-8000-000000000001';
    await pool.query(
      `INSERT INTO sessions (id, name, public_code, sport, players_per_game)
       VALUES ($1, 'Open Play', 'demo', 'Pickleball', 4)
       ON CONFLICT (public_code) DO NOTHING`,
      [sessionId],
    );
    const existing = await pool.query('SELECT id FROM sessions WHERE public_code = $1', ['demo']);
    for (let index = 1; index <= 3; index += 1) {
      await pool.query(
        `INSERT INTO courts (id, session_id, label)
         VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [`78400000-0000-4000-8000-${String(index).padStart(12, '0')}`, existing.rows[0].id, `Court ${index}`],
      );
    }
    console.log('Database is ready. Demo queue code: demo');
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Could not initialize PostgreSQL. Start the local database and check DATABASE_URL.');
  console.error(error.message);
  process.exitCode = 1;
});
