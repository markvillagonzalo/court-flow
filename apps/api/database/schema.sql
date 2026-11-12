CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  public_code text NOT NULL UNIQUE,
  sport text NOT NULL DEFAULT 'Racquet sports',
  players_per_game smallint NOT NULL CHECK (players_per_game IN (2, 4)),
  state text NOT NULL DEFAULT 'open' CHECK (state IN ('open', 'closed')),
  version integer NOT NULL DEFAULT 1,
  next_queue_order bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS courts (
  id uuid PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  label text NOT NULL,
  state text NOT NULL DEFAULT 'available' CHECK (state IN ('available', 'playing')),
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS courts_active_label_unique
  ON courts (session_id, label) WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS player_tickets (
  id uuid PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  visitor_id text NOT NULL,
  display_name text NOT NULL,
  status text NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting', 'playing', 'left', 'skipped')),
  queue_order bigint NOT NULL,
  leave_after_match boolean NOT NULL DEFAULT false,
  joined_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS player_tickets_one_active_visitor
  ON player_tickets (session_id, visitor_id)
  WHERE status IN ('waiting', 'playing');
CREATE INDEX IF NOT EXISTS player_tickets_waiting_fifo
  ON player_tickets (session_id, queue_order, id)
  WHERE status = 'waiting';

CREATE TABLE IF NOT EXISTS matches (
  id uuid PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  court_id uuid NOT NULL REFERENCES courts(id),
  status text NOT NULL DEFAULT 'playing' CHECK (status IN ('playing', 'completed')),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  winner_side smallint CHECK (winner_side IS NULL OR winner_side IN (1, 2))
);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS winner_side smallint;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'matches_winner_side_check' AND conrelid = 'matches'::regclass
  ) THEN
    ALTER TABLE matches ADD CONSTRAINT matches_winner_side_check
      CHECK (winner_side IS NULL OR winner_side IN (1, 2));
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS matches_one_active_per_court
  ON matches (court_id) WHERE status = 'playing';

CREATE TABLE IF NOT EXISTS match_players (
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  ticket_id uuid NOT NULL REFERENCES player_tickets(id),
  side smallint NOT NULL CHECK (side IN (1, 2)),
  PRIMARY KEY (match_id, ticket_id)
);
ALTER TABLE match_players ADD COLUMN IF NOT EXISTS side smallint;
WITH ranked_players AS (
  SELECT mp.match_id,
         mp.ticket_id,
         row_number() OVER (PARTITION BY mp.match_id ORDER BY p.queue_order, p.id, mp.ticket_id) AS player_number,
         count(*) OVER (PARTITION BY mp.match_id) AS player_count
  FROM match_players mp
  JOIN player_tickets p ON p.id = mp.ticket_id
), assigned_sides AS (
  SELECT match_id,
         ticket_id,
         CASE
           WHEN player_count = 2 THEN player_number
           WHEN player_count = 4 AND player_number <= 2 THEN 1
           WHEN player_count = 4 THEN 2
           WHEN player_number <= (player_count + 1) / 2 THEN 1
           ELSE 2
         END AS side
  FROM ranked_players
)
UPDATE match_players mp
SET side = assigned_sides.side
FROM assigned_sides
WHERE assigned_sides.match_id = mp.match_id
  AND assigned_sides.ticket_id = mp.ticket_id
  AND mp.side IS NULL;
ALTER TABLE match_players ALTER COLUMN side SET NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'match_players_side_check' AND conrelid = 'match_players'::regclass
  ) THEN
    ALTER TABLE match_players ADD CONSTRAINT match_players_side_check CHECK (side IN (1, 2));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS audit_events (
  id bigserial PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  actor_type text NOT NULL CHECK (actor_type IN ('staff', 'player', 'system')),
  actor_label text NOT NULL,
  target_label text NOT NULL,
  reason text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_events_session_recent
  ON audit_events (session_id, created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS command_receipts (
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  command_key text NOT NULL,
  response_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, command_key)
);
