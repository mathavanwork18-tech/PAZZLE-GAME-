-- ==========================================================
-- SUPABASE MIGRATION: ALLOW DIRECT CLIENT STORAGE & SYNC
-- Enables frontend players to store username, avatar, score directly to Supabase
-- ==========================================================

-- 1. Ensure required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Add extra gameplay columns to players table if they do not exist
ALTER TABLE players ADD COLUMN IF NOT EXISTS player_code VARCHAR(50);
ALTER TABLE players ADD COLUMN IF NOT EXISTS hat_id VARCHAR(50) DEFAULT 'none';
ALTER TABLE players ADD COLUMN IF NOT EXISTS glasses_id VARCHAR(50) DEFAULT 'none';
ALTER TABLE players ADD COLUMN IF NOT EXISTS outfit_id VARCHAR(50) DEFAULT 'none';
ALTER TABLE players ADD COLUMN IF NOT EXISTS total_score INT DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS coins INT DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS round_1_score INT DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS round_2_score INT DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS round_1_moves INT DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS round_2_moves INT DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS round_1_time_ms BIGINT DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS round_2_time_ms BIGINT DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS completed_round_1 BOOLEAN DEFAULT false;
ALTER TABLE players ADD COLUMN IF NOT EXISTS completed_round_2 BOOLEAN DEFAULT false;
ALTER TABLE players ADD COLUMN IF NOT EXISTS session_token TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS shuffled_puzzle_r1 INT[];
ALTER TABLE players ADD COLUMN IF NOT EXISTS shuffled_puzzle_r2 INT[];

-- 3. Set default values for smoother client-side insertion
ALTER TABLE players ALTER COLUMN match_id SET DEFAULT '00000000-0000-0000-0000-000000000002';
ALTER TABLE players ALTER COLUMN animal_id SET DEFAULT 'fox';
ALTER TABLE players ALTER COLUMN session_token_hash SET DEFAULT '';
ALTER TABLE players ALTER COLUMN status SET DEFAULT 'WAITING';
ALTER TABLE players ALTER COLUMN connection_status SET DEFAULT 'connected';

-- 4. Enable Row Level Security (RLS) on all gameplay tables
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE avatars ENABLE ROW LEVEL SECURITY;
ALTER TABLE puzzles ENABLE ROW LEVEL SECURITY;

-- 5. Grant explicit table access to anon and authenticated roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON TABLE players TO anon, authenticated;
GRANT ALL ON TABLE player_sessions TO anon, authenticated;
GRANT ALL ON TABLE player_rounds TO anon, authenticated;
GRANT ALL ON TABLE scores TO anon, authenticated;
GRANT ALL ON TABLE matches TO anon, authenticated;
GRANT ALL ON TABLE avatars TO anon, authenticated;
GRANT ALL ON TABLE puzzles TO anon, authenticated;

-- 6. Clean up any existing policies to avoid naming conflicts
DROP POLICY IF EXISTS "Public read players in match" ON players;
DROP POLICY IF EXISTS "Public read players" ON players;
DROP POLICY IF EXISTS "Public insert players" ON players;
DROP POLICY IF EXISTS "Public update players" ON players;
DROP POLICY IF EXISTS "Public delete players" ON players;

DROP POLICY IF EXISTS "Public read player_sessions" ON player_sessions;
DROP POLICY IF EXISTS "Public insert player_sessions" ON player_sessions;
DROP POLICY IF EXISTS "Public update player_sessions" ON player_sessions;

DROP POLICY IF EXISTS "Public read player_rounds" ON player_rounds;
DROP POLICY IF EXISTS "Public insert player_rounds" ON player_rounds;
DROP POLICY IF EXISTS "Public update player_rounds" ON player_rounds;

DROP POLICY IF EXISTS "Public read scores" ON scores;
DROP POLICY IF EXISTS "Public insert scores" ON scores;
DROP POLICY IF EXISTS "Public update scores" ON scores;

DROP POLICY IF EXISTS "Public read matches" ON matches;
DROP POLICY IF EXISTS "Public update matches" ON matches;

-- 7. Define open public policies for seamless game room participation
CREATE POLICY "Public read players" 
  ON players FOR SELECT 
  TO anon, authenticated 
  USING (true);

CREATE POLICY "Public insert players" 
  ON players FOR INSERT 
  TO anon, authenticated 
  WITH CHECK (true);

CREATE POLICY "Public update players" 
  ON players FOR UPDATE 
  TO anon, authenticated 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Public read player_sessions" 
  ON player_sessions FOR SELECT 
  TO anon, authenticated 
  USING (true);

CREATE POLICY "Public insert player_sessions" 
  ON player_sessions FOR INSERT 
  TO anon, authenticated 
  WITH CHECK (true);

CREATE POLICY "Public update player_sessions" 
  ON player_sessions FOR UPDATE 
  TO anon, authenticated 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Public read player_rounds" 
  ON player_rounds FOR SELECT 
  TO anon, authenticated 
  USING (true);

CREATE POLICY "Public insert player_rounds" 
  ON player_rounds FOR INSERT 
  TO anon, authenticated 
  WITH CHECK (true);

CREATE POLICY "Public update player_rounds" 
  ON player_rounds FOR UPDATE 
  TO anon, authenticated 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Public read scores" 
  ON scores FOR SELECT 
  TO anon, authenticated 
  USING (true);

CREATE POLICY "Public insert scores" 
  ON scores FOR INSERT 
  TO anon, authenticated 
  WITH CHECK (true);

CREATE POLICY "Public update scores" 
  ON scores FOR UPDATE 
  TO anon, authenticated 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Public read matches" 
  ON matches FOR SELECT 
  TO anon, authenticated 
  USING (true);

CREATE POLICY "Public update matches" 
  ON matches FOR UPDATE 
  TO anon, authenticated 
  USING (true) 
  WITH CHECK (true);

-- 8. Seed default event & match record if missing
INSERT INTO events (id, title, subtitle, event_code, is_active, max_players_default)
VALUES ('00000000-0000-0000-0000-000000000001', 'Engineering Day 2026', 'Think. Arrange. Solve.', 'ENGDAY26', true, 40)
ON CONFLICT (id) DO NOTHING;

INSERT INTO matches (
    id, event_id, match_code, status, current_round, max_players,
    round_1_puzzle_id, round_1_duration_seconds, round_2_puzzle_id, round_2_duration_seconds, version
)
VALUES (
    '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001',
    'ENGDAY26', 'WAITING', 1, 40,
    '11111111-1111-1111-1111-111111111111', 180, '22222222-2222-2222-2222-222222222222', 600, 1
)
ON CONFLICT (id) DO NOTHING;
